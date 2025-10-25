import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd  # Kita butuh pandas untuk holiday

# Coba impor holidays, jika gagal, beri peringatan
try:
    from holidays import Indonesia
except ImportError:
    print("WARNING: 'holidays' library not installed. 'Is Holiday' feature will be 0.")
    Indonesia = None

class SLAPredictor:
    def __init__(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'rf_sla_model.pkl')
        encoders_path = os.path.join(script_dir, 'label_encoders.pkl')
        scaler_path = os.path.join(script_dir, 'minmax_scaler.pkl')
        features_path = os.path.join(script_dir, 'feature_names.pkl')
        
        # Inisialisasi kalender libur
        if Indonesia:
            # Ambil tahun sekarang dan tahun depan untuk kalender libur
            current_year = datetime.now().year
            self.holidays_id = Indonesia(years=[current_year, current_year + 1])
            self.holiday_dates = set(self.holidays_id.keys())
        else:
            self.holiday_dates = set()

        # Validasi file
        missing_files = []
        for path, name in [
            (model_path, 'rf_sla_model.pkl'), 
            (encoders_path, 'label_encoders.pkl'), 
            (scaler_path, 'minmax_scaler.pkl'), 
            (features_path, 'feature_names.pkl')
        ]:
            if not os.path.exists(path):
                missing_files.append(name)
        
        if missing_files:
            raise FileNotFoundError(f"File hilang di {script_dir}: {', '.join(missing_files)}. Pastikan Anda sudah melatih ulang model dan menyalin file .pkl yang baru.")
        
        self.model = joblib.load(model_path)
        self.encoders = joblib.load(encoders_path) # Dict encoders
        self.scaler = joblib.load(scaler_path)
        self.feature_names = joblib.load(features_path)
        
        # Cari tahu kolom mana yang di-scale saat training
        # Ini jauh lebih aman daripada hardcode indeks
        try:
            # Cek scaler punya atribut features_names_in_ (dari scikit-learn >= 0.24)
            self.scaled_feature_names = self.scaler.feature_names_in_
            print(f"Scaler dilatih pada fitur: {self.scaled_feature_names}")
        except AttributeError:
            # Fallback jika versi scikit-learn lama (mengambil dari notebook Anda)
            self.scaled_feature_names = ['Days to Due'] # Sesuaikan jika Anda mengubah scaling di notebook
            print(f"Scaler fallback, asumsi fitur: {self.scaled_feature_names}")
            
        print("Model (versi baru) berhasil dimuat!")
        print(f"Model ini mengharapkan {len(self.feature_names)} fitur:")
        print(self.feature_names)


    def _is_off(self, dt):
        """ Cek apakah tanggal adalah weekend (Sabtu=5, Minggu=6) atau hari libur """
        is_weekend = dt.weekday() >= 5
        is_holiday = dt.date() in self.holiday_dates
        return 1 if (is_weekend or is_holiday) else 0

    def preprocess_input(self, input_data):
        # 1. Konversi Tanggal
        try:
            # Input dari form <input type="datetime-local"> adalah 'YYYY-MM-DDTHH:MM'
            open_dt = datetime.fromisoformat(input_data['open_date'])
            due_dt = datetime.fromisoformat(input_data['due_date'])
        except ValueError as e:
            raise ValueError(f"Format tanggal salah. Harusnya YYYY-MM-DDTHH:MM. Error: {e}")

        # 2. Buat DataFrame 1 baris untuk preprocessing
        # Ini memastikan urutan dan nama kolom selalu benar
        processed_df = pd.DataFrame(columns=self.feature_names)
        
        # 3. Hitung Fitur Turunan (sesuai notebook Cell 11-16)
        processed_df.loc[0, 'Days to Due'] = (due_dt - open_dt).days
        processed_df.loc[0, 'Open Month'] = open_dt.month
        processed_df.loc[0, 'Application Creation Day of Week'] = open_dt.weekday() + 1 # Senin=1
        processed_df.loc[0, 'Application Creation Hour'] = open_dt.hour
        processed_df.loc[0, 'Application SLA Deadline Day of Week'] = due_dt.weekday() + 1 # Senin=1
        processed_df.loc[0, 'Application SLA Deadline Hour'] = due_dt.hour
        processed_df.loc[0, 'Is Open Date Off'] = self._is_off(open_dt)
        processed_df.loc[0, 'Is Due Date Off'] = self._is_off(due_dt)
        
        # 4. Handle Fitur Kategorikal (dari input form)
        for col_name_map in [
            ('Priority', 'priority'), # (Nama di Notebook, Nama di Form React)
            ('Category', 'category'),
            ('Item', 'item'),
            ('Sub Category', 'sub_category') # Tambahkan 'sub_category' di React
        ]:
            notebook_col, react_col = col_name_map
            
            if notebook_col in self.encoders:
                le = self.encoders[notebook_col]
                input_val = input_data.get(react_col, 'nan').lower().strip() # Ambil dari form, fallback 'nan'

                # Cek apakah nilai ini ada saat training
                if input_val in le.classes_:
                    encoded_val = le.transform([input_val])[0]
                else:
                    # Jika nilai baru (unseen), kita fallback
                    # Coba 'nan' (jika Sub Category kosong) atau 'unknown'
                    if 'nan' in le.classes_:
                        encoded_val = le.transform(['nan'])[0]
                    elif 'unknown' in le.classes_:
                         encoded_val = le.transform(['unknown'])[0]
                    else:
                        encoded_val = -1 # Nilai aman jika 'nan' pun tidak ada
                
                processed_df.loc[0, notebook_col] = encoded_val
            
        # 5. Isi sisanya dengan 0 (jika ada fitur yg terlewat, misal Wc, Ac, dll.)
        processed_df = processed_df.fillna(0)
        
        # 6. Scaling (Cara Aman)
        if self.scaled_feature_names:
            # Pastikan kolom scaling ada di df
            cols_to_scale = [col for col in self.scaled_feature_names if col in processed_df.columns]
            if cols_to_scale:
                processed_df[cols_to_scale] = self.scaler.transform(processed_df[cols_to_scale])
        
        # 7. Kembalikan sebagai numpy array
        # Pastikan urutannya SAMA PERSIS dengan saat training
        return processed_df[self.feature_names].values

    def predict(self, input_data):
        try:
            X = self.preprocess_input(input_data)
            
            pred = self.model.predict(X)[0]
            proba_all = self.model.predict_proba(X)[0]
            
            # Cari probabilitas untuk kelas 1 (Melanggar)
            # self.model.classes_ akan berisi [0, 1]
            violated_idx = np.where(self.model.classes_ == 1)[0][0]
            prob = proba_all[violated_idx] * 100
            
            # Ambil data turunan untuk ditampilkan
            days_to_due = (datetime.fromisoformat(input_data['due_date']) - datetime.fromisoformat(input_data['open_date'])).days
            open_hour = datetime.fromisoformat(input_data['open_date']).hour
            
            return {
                'status': 'sukses',
                'sla_violated': bool(pred),
                'confidence': round(prob, 2),
                'violation_text': 'Ya' if pred else 'Tidak',
                'days_to_due': days_to_due,
                'open_hour': open_hour
            }
        except Exception as e:
            print(f"ERROR saat prediksi: {e}")
            # Mengembalikan error ke frontend
            return {'status': 'error', 'message': str(e)}