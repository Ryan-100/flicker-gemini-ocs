from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SciencePlanViewSet, login_view

router = DefaultRouter()
router.register(r'plans', SciencePlanViewSet)

urlpatterns = [
    path('login/', login_view, name='login'),
    path('', include(router.urls)),
]
