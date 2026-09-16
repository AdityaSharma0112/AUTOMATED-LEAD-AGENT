from django.contrib import admin
from django.urls import path, include
from leads.views import health_check

urlpatterns = [
    path('health', health_check, name='root_health_check'),
    path('admin/', admin.site.urls),
    path('api/', include('leads.urls')),
]

