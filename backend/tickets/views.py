import json
import os

import joblib
import numpy as np
from django.conf import settings  # Impor ini
from django.db.models import Avg, Count, FloatField, Q
from django.db.models.functions import Cast  # Untuk pembagian
from django.db.models.functions import TruncMonth
from django.http import JsonResponse  # Pastikan ini ada
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination  # Tambah import ini
from rest_framework.response import Response

from .models import Ticket
from .serializers import TicketSerializer
from .utils.model_utils import SLAPredictor

predictor = SLAPredictor()  # Init global (load sekali)
APP_DIR = os.path.dirname(os.path.abspath(__file__)) 
# Gabungkan dengan path relatif ke file .pkl di dalam folder 'utils'
ENCODERS_PATH = os.path.join(APP_DIR, 'utils', 'label_encoders.pkl')

FEATURE_IMPORTANCE_PATH = os.path.join(APP_DIR, 'utils', 'feature_importances.json')

@api_view(['GET'])
def get_feature_importance(request):
    """
    Membaca data feature importance yang disimpan dari notebook.
    """
    try:
        with open(FEATURE_IMPORTANCE_PATH, 'r') as f:
            importance_data = json.load(f)
            # Kirim langsung data (sudah dalam format list of dict)
            # Ambil Top 10 saja
            return Response(importance_data[:10])
    except FileNotFoundError:
        return Response({'error': f'File {os.path.basename(FEATURE_IMPORTANCE_PATH)} tidak ditemukan.'}, status=500)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
    
import json
import os


@api_view(['GET'])
def get_clusters(request):
    """API untuk data clustering K-Prototypes"""
    json_path = os.path.join(settings.BASE_DIR, 'tickets', 'static', 'clustering', 'cluster_results.json')

    # Fallback sample data (sudah benar)
    sample_data = {
        'num_clusters': 4,
        'centroids': [[5.74, 0.37], [5.48, 0.39], [6.58, 0.21], [5.47, 0.39]],
        'summary_per_cluster': {
            '0': {'mean_numerical': {'Days to Due': 4.0, 'Resolution Duration': 5.74}, 'mode_categorical': {'Priority': '4 - Low'}},
            '1': {'mean_numerical': {'Days to Due': 3.0, 'Resolution Duration': 5.48}, 'mode_categorical': {'Priority': '4 - Low'}},
            '2': {'mean_numerical': {'Days to Due': 2.0, 'Resolution Duration': 6.58}, 'mode_categorical': {'Priority': '3 - Medium'}},
            '3': {'mean_numerical': {'Days to Due': 4.5, 'Resolution Duration': 5.47}, 'mode_categorical': {'Priority': '4 - Low'}},
         },
         'pca_coords': [[1.2, 2.3, 0], [3.4, 1.5, 1], [-0.5, -1.0, 2], [2.0, 0.5, 3], [1.8, 2.0, 0]], # Tambah label cluster asli
         'cluster_labels': [0, 1, 2, 3, 0], # Contoh label
         'explained_variance': [0.45, 0.25],
         'numerical_columns_summary': ['Days to Due', 'Resolution Duration'], # Contoh
         'categorical_columns_summary': ['Priority'], # Contoh
    }

    # Load data (sudah benar)
    try:
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                data = json.load(f)
            print("Cluster JSON loaded from file.")
        else:
            data = sample_data
            print("Using sample data (generate JSON from notebook first).")
    except json.JSONDecodeError as e:
        print(f"JSON invalid: {e}")
        data = sample_data
    except Exception as e:
        print(f"Load error: {e}")
        data = sample_data

    # --- PERBAIKAN BAGIAN CHARTS ---
    charts = {}
    num_clusters = data.get('num_clusters', 0)
    pca_coords = data.get('pca_coords', [])
    cluster_labels = data.get('cluster_labels', [])
    summary = data.get('summary_per_cluster', {})
    numerical_cols = data.get('numerical_columns_summary', []) # Ambil dari JSON jika ada

    # 1. PCA Scatter Chart Data
    if pca_coords and cluster_labels and len(pca_coords) == len(cluster_labels) and num_clusters > 0:
        pca_datasets = []
        # Batasi jumlah titik untuk performa frontend
        limit = 1000
        indices_to_plot = np.random.choice(len(pca_coords), min(limit, len(pca_coords)), replace=False)

        for cluster_id in range(num_clusters):
            # Filter titik PCA berdasarkan label cluster asli DARI JSON
            cluster_points = [
                {'x': pca_coords[i][0], 'y': pca_coords[i][1]}
                for i in indices_to_plot if cluster_labels[i] == cluster_id
            ]

            pca_datasets.append({
                'label': f'Cluster {cluster_id}',
                'data': cluster_points,
                'backgroundColor': f'hsl({cluster_id * (360 / num_clusters)}, 70%, 50%)', # Distribusi warna lebih baik
                'pointRadius': 3,
            })
        charts['pca_scatter'] = {'datasets': pca_datasets}
    else:
        charts['pca_scatter'] = None # Atau {'datasets': []}

    # 2. Mean Bar Chart Data
    bar_chart_datasets = []
    if summary and numerical_cols:
        # Loop melalui setiap fitur numerik untuk membuat dataset terpisah
        for num_col in numerical_cols:
            dataset = {
                'label': num_col, # Label dataset adalah nama fitur
                'data': [summary.get(str(i), {}).get('mean_numerical', {}).get(num_col, None) for i in range(num_clusters)],
                 # Anda bisa menambahkan warna spesifik per fitur jika mau
                'backgroundColor': f'hsl({np.random.randint(0, 360)}, 60%, 60%)',
            }
            bar_chart_datasets.append(dataset)

    charts['mean_bar'] = {
        'labels': [f'Cluster {i}' for i in range(num_clusters)],
        'datasets': bar_chart_datasets,
    }

    # 3. Mode Pie/Doughnut Chart Data (Contoh untuk 'Priority')
    # Anda perlu memilih SATU fitur kategorikal untuk pie chart per cluster
    pie_charts_data = {}
    categorical_col_for_pie = 'Priority' # Pilih kolom yang ingin divisualisasikan
    if summary and data.get('categorical_columns_summary'):
         if categorical_col_for_pie in data['categorical_columns_summary']:
             pie_labels = []
             pie_datasets_data = []
             cluster_sizes = []

             for i in range(num_clusters):
                  cluster_summary = summary.get(str(i), {})
                  mode_value = cluster_summary.get('mode_categorical', {}).get(categorical_col_for_pie, 'Unknown')
                  pie_labels.append(f"Cluster {i} ({mode_value})") # Label termasuk modus
                  cluster_sizes.append(cluster_summary.get('size', 0))

             # Membuat satu dataset untuk pie/doughnut chart ukuran cluster
             # (Anda bisa membuat pie chart berbeda untuk distribusi modus jika datanya ada)
             pie_datasets_data = cluster_sizes
             background_colors = [f'hsl({i * (360 / num_clusters)}, 70%, 50%)' for i in range(num_clusters)]

             pie_charts_data = {
                 'labels': pie_labels,
                 'datasets': [{
                     'data': pie_datasets_data,
                     'backgroundColor': background_colors,
                 }],
             }

    charts['cluster_size_pie'] = pie_charts_data # Ubah nama key agar lebih jelas


    # Return data asli dan data chart
    # return Response({'cluster_data': data, 'charts_data': charts})
    # ATAU hanya return data chart jika itu yang dibutuhkan frontend
    return Response(charts)
    
    # Bar: Mean numerical (top 3 cols)
    numerical_cols = list(data.get('summary_per_cluster', {}).get(0, {}).get('mean_numerical', {}).keys())[:3]
    for col in numerical_cols:
        charts['mean_bar']['datasets'].push({
            'label': col,
            'data': [data['summary_per_cluster'][i]['mean_numerical'].get(col, 0) for i in range(data.get('num_clusters', 4))],
            'backgroundColor': ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)'],
        });
    
    # Pie: Mode kategorikal (sample per cluster)
    categorical_cols = list(data.get('summary_per_cluster', {}).get(0, {}).get('mode_categorical', {}).keys())[:1]  # Top 1
    for col in categorical_cols:
        for cluster_id in range(data.get('num_clusters', 4)):
            mode = data['summary_per_cluster'][cluster_id]['mode_categorical'].get(col, 'Unknown')
            charts['mode_pie']['labels'].push(f'Cluster {cluster_id}: {mode}');
            charts['mode_pie']['datasets'].push({
                'data': [data['summary_per_cluster'][cluster_id]['size']],
                'backgroundColor': 'rgba(153, 102, 255, 0.6)',
            });

@api_view(['GET'])
def get_violation_by_category(request):
    """
    Menghitung persentase pelanggaran SLA per kategori.
    """
    category_stats = Ticket.objects.values('category').annotate(
        total_tickets=Count('number'),
        violated_tickets=Count('number', filter=Q(is_sla_violated=True))
    ).order_by('-total_tickets') # Urutkan dari yg paling banyak tiketnya

    results = []
    for stat in category_stats:
        total = stat['total_tickets']
        violated = stat['violated_tickets']
        # Hitung rate, hindari pembagian dengan nol
        violation_rate = (violated / total * 100) if total > 0 else 0
        results.append({
            'category': stat['category'],
            'violation_rate': round(violation_rate, 2), # Ambil 2 desimal
            'total_tickets': total # Kirim total juga, mungkin berguna
        })

    # Top 10 kategori saja agar chart tidak terlalu ramai
    return Response(results[:10])

@api_view(['GET'])
def get_monthly_trend(request):
    """
    Menghitung total tiket dan tiket melanggar per bulan (berdasarkan open_date).
    """
    monthly_data = Ticket.objects.annotate(
        # Ekstrak bulan dari open_date
        month=TruncMonth('open_date')
    ).values('month').annotate(
        # Hitung total dan pelanggaran per bulan
        total_tickets=Count('number'),
        violated_tickets=Count('number', filter=Q(is_sla_violated=True))
    ).order_by('month') # Urutkan berdasarkan bulan

    # Format output agar mudah dibaca chart
    results = [
        {
            'month': data['month'].strftime('%Y-%m'), # Format YYYY-MM
            'total_tickets': data['total_tickets'],
            'violated_tickets': data['violated_tickets']
        } for data in monthly_data
    ]
    return Response(results)

@api_view(['POST'])
def predict_sla(request):
    input_data = request.data
    try:
        # Gunakan 'predictor' global yang sudah di-load
        result = predictor.predict(input_data)
        
        # Cek apakah predict() mengembalikan error
        if result.get('status') == 'error':
             return Response({'error': result.get('message', 'Prediksi gagal')}, status=400)
             
        return Response(result)
    except Exception as e:
        print(f"Predict error detail: {type(e).__name__}: {e}")
        return Response({'error': f'{type(e).__name__}: {str(e)}'}, status=400)
    
    
@api_view(['GET'])
def get_unique_values(request):
    try:
        # 1. Muat file encoders yang sudah disimpan
        encoders = joblib.load(ENCODERS_PATH)
        
        # 2. Ambil 'classes_' (yaitu unique values) dari setiap encoder
        # Kita format sebagai {value: 'nilai_asli', label: 'Tampilan Cantik'}
        
        # Mengambil dari 'Category'
        categories = [
            {'value': val, 'label': val.replace('-', ' ').title()} 
            for val in encoders['Category'].classes_ if val not in ['nan', 'unknown']
        ]
        
        # Mengambil dari 'Item'
        items = [
            {'value': val, 'label': val.title()} 
            for val in encoders['Item'].classes_ if val not in ['nan', 'unknown']
        ]
        
        # 3. MENGAMBIL DARI 'Sub Category'
        sub_categories = [
            {'value': val, 'label': val.title()} 
            for val in encoders['Sub Category'].classes_ if val not in ['nan', 'unknown']
        ]
        
        # 4. Urutkan berdasarkan label untuk tampilan yang rapi
        categories.sort(key=lambda x: x['label'])
        items.sort(key=lambda x: x['label'])
        sub_categories.sort(key=lambda x: x['label'])

        return Response({
            'categories': categories,
            'items': items,
            'sub_categories': sub_categories # Kirim data baru ini
        })

    except FileNotFoundError:
        return Response({'error': f'File encoders.pkl tidak ditemukan di {ENCODERS_PATH}'}, status=500)
    except KeyError as e:
        return Response({'error': f'Key {e} tidak ditemukan di label_encoders.pkl. Pastikan Anda menyimpan "Category", "Item", dan "Sub Category".'}, status=500)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Custom Pagination (15 per page)
class TicketPagination(PageNumberPagination):
    page_size = 7  # Load 15 dulu
    page_size_query_param = 'page_size'
    max_page_size = 100  # Max jika user ubah

# API untuk list tickets (sekarang paginated)
class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ticket.objects.all().order_by('-open_date')  # Semua, tanpa slice
    serializer_class = TicketSerializer
    pagination_class = TicketPagination  # Aktifkan pagination
    lookup_field = 'number'

    def get_queryset(self):
        # Pastikan assignment dulu
        base_queryset = super().get_queryset()
        if not base_queryset:
            print("Warning: super().get_queryset() returned None")  # Debug
            return Ticket.objects.none()  # Fallback empty

        queryset = base_queryset  # Assign ke variabel lokal

        # Search by ID (partial match)
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(Q(number__icontains=search_query))

        # Filter by priority
        priority_filter = self.request.query_params.get('priority', None)
        if priority_filter and priority_filter != 'all':
            queryset = queryset.filter(priority=priority_filter)

        # Filter by category
        category_filter = self.request.query_params.get('category', None)
        if category_filter and category_filter != 'all':
            queryset = queryset.filter(category=category_filter)

        # Sort by open_date
        sort_order = self.request.query_params.get('sort', '-open_date')
        if sort_order in ['open_date', '-open_date']:
            queryset = queryset.order_by(sort_order)
        else:
            queryset = queryset.order_by('-open_date')  # Default fallback

        print(f"Queryset count after filters: {queryset.count()}")  # Debug di Django console
        return queryset

# get_stats tetap sama (tidak paginated, karena agregat cepat)
@api_view(['GET'])
def get_stats(request):
    total = Ticket.objects.aggregate(total=Count('number'))['total']
    violations = Ticket.objects.filter(is_sla_violated=True).aggregate(count=Count('number'))['count']
    compliance = total - violations
    rate = (compliance / total * 100) if total > 0 else 0

    low_priority = Ticket.objects.filter(priority='4 - Low').aggregate(count=Count('number'))['count']
    medium_priority = Ticket.objects.filter(priority='3 - Medium').aggregate(count=Count('number'))['count']
    high_priority = Ticket.objects.filter(priority='2 - High').aggregate(count=Count('number'))['count']
    critical_priority = Ticket.objects.filter(priority='1 - Critical').aggregate(count=Count('number'))['count']
    avg_duration = Ticket.objects.aggregate(avg=Avg('resolution_duration'))['avg'] or 0
    avg_compliance = Ticket.objects.aggregate(avg=Avg('application_sla_compliance_rate'))['avg'] or 0

    data = {
        'total_tickets': total,
        'violation_count': violations,
        'compliance_count': compliance,
        'compliance_rate': round(rate, 1),
        'low_priority_count': low_priority,
        'medium_priority_count': medium_priority,
        'high_priority_count': high_priority,
        'critical_priority_count': critical_priority,
        'avg_resolution_duration': round(avg_duration, 2),
        'avg_compliance_rate': round(avg_compliance * 100, 1),
    }
    return Response(data)