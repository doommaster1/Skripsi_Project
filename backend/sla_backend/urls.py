from django.contrib import admin
from django.http import HttpResponse  # Tambah untuk simple view
from django.urls import include, path, re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('tickets.urls')),  # /api/tickets/ untuk list, /api/stats/ untuk stats
    path('accounts/', include('allauth.urls')),  # Allauth routes (login, register, reset)

    # Endpoint API baru untuk login/logout/reset (JSON)
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),

    # Simple redirect:
    re_path(r'^$', lambda request: HttpResponse('<h1>Welcome to SLA Predictor! Go to <a href="/admin/">Admin</a> or <a href="/api/tickets/">API</a></h1>')),
]
