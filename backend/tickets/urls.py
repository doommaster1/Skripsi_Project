from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (TicketViewSet, get_clusters,  # Tambah import
                    get_feature_importance, get_monthly_trend, get_stats,
                    get_unique_values, get_violation_by_category, predict_sla)

router = DefaultRouter()
router.register(r'tickets', TicketViewSet)  # /api/tickets/ untuk list

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', get_stats, name='stats'),  # /api/stats/ untuk stats
    path('predict/', predict_sla, name='predict_sla'),  
    path('unique-values/', get_unique_values, name='unique_values'),
    path('stats/violation-by-category/', get_violation_by_category, name='violation_by_category'),
    path('stats/monthly-trend/', get_monthly_trend, name='monthly_trend'), # Tambah URL ini
    path('stats/feature-importance/', get_feature_importance, name='feature_importance'),
    path('clusters/', get_clusters, name='clusters'),  # Baru
]