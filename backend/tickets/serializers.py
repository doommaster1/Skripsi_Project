from rest_framework import serializers
from .models import Ticket
from django.utils import timezone
from datetime import datetime

class TicketSerializer(serializers.ModelSerializer):
    # Format date untuk readable di frontend
    open_date = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', required=False)
    closed_date = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', required=False)
    due_date = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', required=False)
    sla_violated_text = serializers.SerializerMethodField()  # 'Ya'/'Tidak' untuk frontend
    resolution_duration_formatted = serializers.SerializerMethodField()  # e.g., '2.725 hari'
    compliance_rate_percent = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = '__all__'  # Semua fields dari model (sesuai CSV)
    
    def get_sla_violated_text(self, obj):
        return 'Ya' if obj.is_sla_violated else 'Tidak'

    def get_resolution_duration_formatted(self, obj):
        return f"{obj.resolution_duration:.2f} hari"

    def get_compliance_rate_percent(self, obj):
        return f"{obj.application_sla_compliance_rate * 100:.1f}%"

# class StatsSerializer(serializers.Serializer):
#     total_tickets = serializers.IntegerField()
#     violation_count = serializers.IntegerField()
#     compliance_count = serializers.IntegerField()
#     compliance_rate = serializers.FloatField()  # %

#     # Tambahan stats berdasarkan CSV (e.g., per priority/category)
#     low_priority_count = serializers.IntegerField()
#     medium_priority_count = serializers.IntegerField()
#     high_priority_count = serializers.IntegerField()
#     critical_priority_count = serializers.IntegerField()
#     avg_resolution_duration = serializers.FloatField()
#     avg_compliance_rate = serializers.FloatField()