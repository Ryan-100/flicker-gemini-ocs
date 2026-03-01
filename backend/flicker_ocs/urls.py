from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('plans.urls')),
    # Serve assets explicitly if not handled by DEBUG static serving
    # But for a simpler fix, we ensure the catch-all doesn't match common asset paths
    re_path(r'^(?!api|admin|assets|vite\.svg).*$', TemplateView.as_view(template_name='index.html')),
]
