import json
import os
from datetime import timedelta

import joblib
import numpy as np
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Avg, Count, FloatField, Q
from django.db.models.functions import Cast, TruncMonth
from django.http import JsonResponse
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Ticket, UserProfile
from .serializers import TicketSerializer
from .utils.model_utils import SLAPredictor

AuthUser = get_user_model()
predictor = SLAPredictor()
APP_DIR = os.path.dirname(os.path.abspath(__file__))
ENCODERS_PATH = os.path.join(APP_DIR, 'utils', 'label_encoders.pkl')
FEATURE_IMPORTANCE_PATH = os.path.join(APP_DIR, 'utils', 'feature_importances.json')


# --- Fungsi Helper untuk Queryset ---
def get_filtered_queryset(request):
    """
    Fungsi helper terpusat untuk menerapkan filter umum
    dari query parameter ke Ticket queryset.
    """
    queryset = Ticket.objects.all()
    
    # Filter Prioritas
    priority_filter = request.query_params.get('priority', None)
    if priority_filter and priority_filter != 'all':
        queryset = queryset.filter(priority=priority_filter)
        
    # Filter Pelanggaran SLA
    violation_filter = request.query_params.get('is_sla_violated', None)
    if violation_filter and violation_filter != 'all':
        if violation_filter == 'true':
            queryset = queryset.filter(is_sla_violated=True)
        elif violation_filter == 'false':
            queryset = queryset.filter(is_sla_violated=False)
            
    return queryset
# --- Akhir Fungsi Helper ---


@api_view(['POST'])
def send_otp(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email diperlukan'}, status=400)
    
    otp = get_random_string(6, allowed_chars='0123456789')
    expiry = timezone.now() + timedelta(minutes=10)
    
    user, created = AuthUser.objects.get_or_create(email=email, defaults={'username': email})
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.otp_code = otp
    profile.otp_expiry = expiry
    profile.save()
    
    send_mail(
        'OTP Reset Password SLA Predictor',
        f'Kod OTP Anda: {otp} (kadaluarsa 10 menit)',
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    
    return Response({'message': 'OTP dikirim ke email Anda'})

@api_view(['POST'])
def verify_otp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    password = request.data.get('new_password')
    
    if not all([email, otp, password]):
        return Response({'error': 'Email, OTP, dan password baru diperlukan'}, status=400)
    
    try:
        user = AuthUser.objects.get(email=email)
        profile = UserProfile.objects.get(user=user)
        if profile.otp_expiry < timezone.now() or profile.otp_code != otp:
            return Response({'error': 'OTP salah atau kadaluarsa'}, status=400)
        
        user.set_password(password)
        user.save()
        profile.email_verified = True
        profile.otp_code = ''
        profile.save()
        
        return Response({'message': 'Password berhasil direset! Silakan login.'})
    except AuthUser.DoesNotExist:
        return Response({'error': 'Email tidak terdaftar'}, status=400)

@api_view(['GET'])
def get_feature_importance(request):
    """
    Membaca data feature importance yang disimpan dari notebook.
    """
    try:
        with open(FEATURE_IMPORTANCE_PATH, 'r') as f:
            importance_data = json.load(f)
            return Response(importance_data[:10])
    except FileNotFoundError:
        return Response({'error': f'File {os.path.basename(FEATURE_IMPORTANCE_PATH)} tidak ditemukan.'}, status=500)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
    
@api_view(['GET'])
def get_clusters(request):
    """
    API untuk data clustering K-Prototypes.
    INI ADALAH VERSI YANG DIPERBAIKI.
    """
    json_path = os.path.join(settings.BASE_DIR, 'tickets', 'static', 'clustering', 'cluster_results.json')

    # Fallback sample data (jika file tidak ada)
    sample_data = {
        'num_clusters': 0,
        'summary_per_cluster': {},
        'pca_coords': [],
        'cluster_labels': [],
        'numerical_columns_summary': [],
        'categorical_columns_summary': [],
    }

    # Load data
    try:
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                data = json.load(f)
            print("Cluster JSON loaded from file.")
        else:
            data = sample_data
            print("Using sample data (cluster_results.json not found).")
    except Exception as e:
        print(f"Load error: {e}")
        data = sample_data

    # --- Mulai Membangun 'charts' ---
    charts = {}
    num_clusters = data.get('num_clusters', 0)
    pca_coords = data.get('pca_coords', [])
    cluster_labels = data.get('cluster_labels', [])
    summary = data.get('summary_per_cluster', {})
    numerical_cols = data.get('numerical_columns_summary', [])

    # 1. PCA Scatter Chart Data
    if pca_coords and cluster_labels and len(pca_coords) == len(cluster_labels) and num_clusters > 0:
        pca_datasets = []
        limit = 1000
        indices_to_plot = np.random.choice(len(pca_coords), min(limit, len(pca_coords)), replace=False)

        for cluster_id in range(num_clusters):
            cluster_points = [
                {'x': pca_coords[i][0], 'y': pca_coords[i][1]}
                for i in indices_to_plot if cluster_labels[i] == cluster_id
            ]
            pca_datasets.append({
                'label': f'Cluster {cluster_id}',
                'data': cluster_points,
                'backgroundColor': f'hsl({cluster_id * (360 / num_clusters)}, 70%, 50%)',
                'pointRadius': 3,
            })
        charts['pca_scatter'] = {'datasets': pca_datasets}
    else:
        charts['pca_scatter'] = None

    # 2. Mean Bar Chart Data
    bar_chart_datasets = []
    if summary and numerical_cols and num_clusters > 0:
        for num_col in numerical_cols:
            dataset = {
                'label': num_col,
                'data': [summary.get(str(i), {}).get('mean_numerical', {}).get(num_col, None) for i in range(num_clusters)],
                'backgroundColor': f'hsl({np.random.randint(0, 360)}, 60%, 60%)',
            }
            bar_chart_datasets.append(dataset)
    
    charts['mean_bar'] = {
        'labels': [f'Cluster {i}' for i in range(num_clusters)],
        'datasets': bar_chart_datasets,
    }

    # 3. Cluster Size Pie Chart Data
    pie_charts_data = {}
    if summary and num_clusters > 0:
         pie_labels = []
         cluster_sizes = []

         for i in range(num_clusters):
              cluster_summary = summary.get(str(i), {})
              # Ambil mode 'Priority' untuk label
              mode_value = cluster_summary.get('mode_categorical', {}).get('Priority', 'Unknown')
              pie_labels.append(f"Cluster {i} ({mode_value})")
              cluster_sizes.append(cluster_summary.get('size', 0))

         background_colors = [f'hsl({i * (360 / num_clusters)}, 70%, 50%)' for i in range(num_clusters)]

         pie_charts_data = {
             'labels': pie_labels,
             'datasets': [{
                 'data': cluster_sizes,
                 'backgroundColor': background_colors,
             }],
         }

    charts['cluster_size_pie'] = pie_charts_data

    # Kembalikan 'charts' yang sudah terisi penuh
    return Response(charts)
    

@api_view(['GET'])
def get_violation_by_category(request):
    """
    Menghitung persentase pelanggaran SLA per kategori.
    """
    queryset = get_filtered_queryset(request)

    category_stats = queryset.values('category').annotate(
        total_tickets=Count('number'),
        violated_tickets=Count('number', filter=Q(is_sla_violated=True))
    ).order_by('-total_tickets') 

    results = []
    for stat in category_stats:
        total = stat['total_tickets']
        violated = stat['violated_tickets']
        violation_rate = (violated / total * 100) if total > 0 else 0
        results.append({
            'category': stat['category'],
            'violation_rate': round(violation_rate, 2),
            'total_tickets': total 
        })

    return Response(results[:10])

@api_view(['GET'])
def get_monthly_trend(request):
    """
    Menghitung total tiket dan tiket melanggar per bulan.
    """
    queryset = get_filtered_queryset(request)

    monthly_data = queryset.annotate(
        month=TruncMonth('open_date')
    ).values('month').annotate(
        total_tickets=Count('number'),
        violated_tickets=Count('number', filter=Q(is_sla_violated=True))
    ).order_by('month') 

    results = [
        {
            'month': data['month'].strftime('%Y-%m'), 
            'total_tickets': data['total_tickets'],
            'violated_tickets': data['violated_tickets']
        } for data in monthly_data
    ]
    return Response(results)

@api_view(['POST'])
def predict_sla(request):
    input_data = request.data
    try:
        result = predictor.predict(input_data)
        if result.get('status') == 'error':
             return Response({'error': result.get('message', 'Prediksi gagal')}, status=400)

        from .models import PredictionLog
        user = request.user if request.user.is_authenticated else None
        ip_address = request.META.get('REMOTE_ADDR')

        PredictionLog.objects.create(
            user=user, 
            input_data=input_data, 
            prediction_result=result, 
            ip_address=ip_address
        )
        return Response(result)
    except Exception as e:
        print(f"Predict error detail: {type(e).__name__}: {e}")
        return Response({'error': f'Internal Server Error: {str(e)}'}, status=500)
    
    
@api_view(['GET'])
def get_unique_values(request):
    try:
        encoders = joblib.load(ENCODERS_PATH)
        
        categories = [
            {'value': val, 'label': val.replace('-', ' ').title()} 
            for val in encoders['Category'].classes_ if val not in ['nan', 'unknown']
        ]
        items = [
            {'value': val, 'label': val.title()} 
            for val in encoders['Item'].classes_ if val not in ['nan', 'unknown']
        ]
        sub_categories = [
            {'value': val, 'label': val.title()} 
            for val in encoders['Sub Category'].classes_ if val not in ['nan', 'unknown']
        ]
        
        categories.sort(key=lambda x: x['label'])
        items.sort(key=lambda x: x['label'])
        sub_categories.sort(key=lambda x: x['label'])

        return Response({
            'categories': categories,
            'items': items,
            'sub_categories': sub_categories
        })
    except FileNotFoundError:
        return Response({'error': f'File encoders.pkl tidak ditemukan di {ENCODERS_PATH}'}, status=500)
    except KeyError as e:
        return Response({'error': f'Key {e} tidak ditemukan di label_encoders.pkl.'}, status=500)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


class TicketPagination(PageNumberPagination):
    page_size = 7 
    page_size_query_param = 'page_size'
    max_page_size = 100

class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ticket.objects.all().order_by('-open_date')
    serializer_class = TicketSerializer
    pagination_class = TicketPagination 
    lookup_field = 'number'

    def get_queryset(self):
        base_queryset = super().get_queryset()
        queryset = base_queryset 

        # Search by ID
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
            
        # Filter Pelanggaran SLA
        violation_filter = self.request.query_params.get('is_sla_violated', None)
        if violation_filter and violation_filter != 'all':
            if violation_filter == 'true':
                queryset = queryset.filter(is_sla_violated=True)
            elif violation_filter == 'false':
                queryset = queryset.filter(is_sla_violated=False)

        # Sort by open_date
        sort_order = self.request.query_params.get('sort', '-open_date')
        if sort_order in ['open_date', '-open_date']:
            queryset = queryset.order_by(sort_order)
        else:
            queryset = queryset.order_by('-open_date') 

        print(f"Queryset count after filters: {queryset.count()}") 
        return queryset

@api_view(['GET'])
def get_stats(request):
    
    queryset = get_filtered_queryset(request)

    total = queryset.aggregate(total=Count('number'))['total']
    violations = queryset.filter(is_sla_violated=True).aggregate(count=Count('number'))['count']
    compliance = total - violations
    rate = (compliance / total * 100) if total > 0 else 0

    low_priority = queryset.filter(priority='4 - Low').aggregate(count=Count('number'))['count']
    medium_priority = queryset.filter(priority='3 - Medium').aggregate(count=Count('number'))['count']
    high_priority = queryset.filter(priority='2 - High').aggregate(count=Count('number'))['count']
    critical_priority = queryset.filter(priority='1 - Critical').aggregate(count=Count('number'))['count']
    avg_duration = queryset.aggregate(avg=Avg('resolution_duration'))['avg'] or 0
    avg_compliance = queryset.aggregate(avg=Avg('application_sla_compliance_rate'))['avg'] or 0

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
