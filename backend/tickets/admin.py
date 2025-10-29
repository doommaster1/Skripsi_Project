from django.contrib import admin

from .models import ClusterSummary, PredictionLog, Ticket, UserProfile


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('number', 'priority', 'category', 'is_sla_violated', 'open_date')
    list_filter = ('priority', 'category', 'is_sla_violated')
    search_fields = ('number', 'item')

@admin.register(PredictionLog)
class PredictionLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'user', 'input_data', 'prediction_result')
    list_filter = ('created_at', 'user')
    search_fields = ('input_data',)

@admin.register(ClusterSummary)
class ClusterSummaryAdmin(admin.ModelAdmin):
    list_display = ('cluster_id', 'size', 'description')
    list_filter = ('cluster_id',)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'email_verified')
    list_filter = ('role', 'email_verified')