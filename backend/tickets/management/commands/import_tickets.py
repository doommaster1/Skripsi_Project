import csv
import os  # Tambah import ini untuk path handling
from django.core.management.base import BaseCommand
from tickets.models import Ticket
from datetime import datetime

class Command(BaseCommand):
    help = 'Import tickets from CSV'

    def handle(self, *args, **options):
        # Path relatif ke subfolder commands (dari root project)
        csv_path = os.path.join('tickets', 'management', 'commands', 'processed_tickets.csv')
        
        # Debug: Cek apakah file ada
        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f"File tidak ditemukan: {csv_path}. Pastikan CSV di {csv_path}"))
            return
        
        self.stdout.write(f"File ditemukan: {csv_path}")
        
        with open(csv_path, 'r', encoding='utf-8') as file:  # Tambah encoding untuk karakter Indonesia
            reader = csv.DictReader(file)
            imported_count = 0
            for row in reader:
                try:
                    # Mapping fields (sesuai model terbaru dari panduan sebelumnya)
                    Ticket.objects.create(
                        number=row['Number'],                   
                        priority=row['Priority'],
                        category=row['Category'],
                        open_date=datetime.strptime(row['Open Date'], '%Y-%m-%d %H:%M:%S'),
                        closed_date=datetime.strptime(row['Closed Date'], '%Y-%m-%d %H:%M:%S') if row['Closed Date'] else None,
                        due_date=datetime.strptime(row['Due Date'], '%Y-%m-%d %H:%M:%S'),
                        time_left_incl_on_hold=float(row['Time Left Incl. On Hold']),
                        item=row['Item'],               
                        is_sla_violated=bool(int(row['Is SLA Violated'])),
                        is_open_date_off=row['Is Open Date Off'],
                        is_due_date_off=row['Is Due Date Off'],
                        days_to_due=int(row['Days to Due']),
                        open_month=int(row['Open Month']),
                        application_creation_day_of_week=row['Application Creation Day of Week'],
                        application_creation_hour=int(row['Application Creation Hour']),
                        application_sla_deadline_day_of_week=row['Application SLA Deadline Day of Week'],
                        application_sla_deadline_hour=int(row['Application SLA Deadline Hour']),
                        resolution_duration=float(row['Resolution Duration']),
                        total_tickets_resolved_wc=float(row['Total Tickets Resolved (Wc)']),
                        sla_threshold=float(row['SLA Threshold']),
                        average_resolution_time_ac=float(row['Average Resolution Time (Ac)']),
                        sla_to_average_resolution_ratio_rc=float(row['SLA to Average Resolution Ratio (Rc)']),
                        application_sla_compliance_rate=float(row['Application SLA Compliance Rate']),
                        # Fields tambahan (dummy jika null, tapi di import ini biarkan default null)
                        # assigned_to=None,  # Atau set dummy jika perlu
                        # affected_users=None,
                        # root_cause=None,
                    )
                    imported_count += 1
                except ValueError as e:
                    self.stdout.write(self.style.WARNING(f"Error parsing row {row.get('Number', 'unknown')}: {e}"))
                    continue  # Skip row error, lanjut ke next
            
            self.stdout.write(self.style.SUCCESS(f'Import selesai! {imported_count} rows imported.'))