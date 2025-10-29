from django.contrib.auth.models import User as AuthUser
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone


# 1. PredictionLog (log prediksi user)
class PredictionLog(models.Model):
    user = models.ForeignKey(AuthUser, on_delete=models.CASCADE, null=True, blank=True)
    input_data = models.JSONField()  # Form input
    prediction_result = models.JSONField()  # Hasil prediksi
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Prediction Logs'

    def __str__(self):
        return f"Prediksi {self.created_at} - User: {self.user or 'Anonymous'}"

class ClusterSummary(models.Model):
    cluster_id = models.PositiveSmallIntegerField(unique=True)
    size = models.PositiveIntegerField()
    centroid_numerical = models.JSONField()  # Mean numerical
    mode_categorical = models.JSONField()  # Mode kategorikal
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['cluster_id']

    def __str__(self):
        return f"Cluster {self.cluster_id} (Size: {self.size})"

class UserProfile(models.Model):
    user = models.OneToOneField(AuthUser, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[('admin', 'Admin'), ('user', 'User'), ('manager', 'Manager')], default='user')
    email_verified = models.BooleanField(default=False)
    otp_code = models.CharField(max_length=6, blank=True)
    otp_expiry = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Profile {self.user.username} - Role: {self.role}"

class Ticket(models.Model):
    # ID dari CSV
    number = models.CharField(max_length=50, primary_key=True)  # Unique ID seperti '3226220'

    # Basic Info
    priority = models.CharField(
        max_length=20,
        choices=[
            ('4 - Low', '4 - Low'),
            ('3 - Medium', '3 - Medium'),
            ('2 - High', '2 - Medium'),
            ('1 - Critical', '1 - Medium')   
        ]
    )
    category = models.CharField(
        max_length=50,
        choices=[
            ('kegagalan proses', 'kegagalan proses'),
            ('event monitoring', 'event monitoring'),
            ('eod production', 'eod production'),
            ('transaction', 'transaction'),
            ('tidak bisa dilakukan', 'tidak bisa dilakukan'),
            ('drop', 'drop'),
            ('cannot access', 'cannot access'),
            ('tidak dapat login', 'tidak dapat login'),
            ('penjelasan detail sebuah transaksi', 'penjelasan detail sebuah transaksi'),
            ('application', 'application'),
            ('hardware', 'hardware'),
            # Tambah dari unique values di CSV jika ada lebih
        ]
    )
    open_date = models.DateTimeField()
    closed_date = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField()
    time_left_incl_on_hold = models.FloatField()  # Bisa negatif

    # Descriptions
    item = models.CharField(max_length=100)  # e.g., 'application 84'
    
    # SLA/ML Features
    is_sla_violated = models.BooleanField(default=False)  # 0/1 dari Random Forest
    is_open_date_off = models.CharField(max_length=20, choices=[('Hari Kerja', 'Hari Kerja'), ('Hari Libur', 'Hari Libur')])
    is_due_date_off = models.CharField(max_length=20, choices=[('Hari Kerja', 'Hari Kerja'), ('Hari Libur', 'Hari Libur')])
    days_to_due = models.IntegerField()

    # Temporal Features
    open_month = models.IntegerField()  # e.g., 1 for Jan
    application_creation_day_of_week = models.CharField(max_length=20)  # e.g., 'Monday', 'Saturday'
    application_creation_hour = models.IntegerField()
    application_sla_deadline_day_of_week = models.CharField(max_length=20)
    application_sla_deadline_hour = models.IntegerField()

    # Duration & Aggregates (dari pra-pemrosesan)
    resolution_duration = models.FloatField()  # Hari
    total_tickets_resolved_wc = models.FloatField()  # Weighted count?
    sla_threshold = models.FloatField()
    average_resolution_time_ac = models.FloatField()
    sla_to_average_resolution_ratio_rc = models.FloatField()
    application_sla_compliance_rate = models.FloatField()  # Rate 0-1

    # Django tracking
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-open_date']  # Default order terbaru
        verbose_name_plural = 'Tickets'

    def __str__(self):
        return f"{self.number} - {self.item} ({self.priority})"