from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse  # Tambah untuk simple view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tickets.urls')),  # /api/tickets/ untuk list, /api/stats/ untuk stats

    # Simple redirect:
    re_path(r'^$', lambda request: HttpResponse('<h1>Welcome to SLA Predictor! Go to <a href="/admin/">Admin</a> or <a href="/api/tickets/">API</a></h1>')),
]