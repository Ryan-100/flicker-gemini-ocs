from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.shortcuts import get_object_or_404
from .models import SciencePlan, PlanStatus, RejectionCategory
from .serializers import SciencePlanSerializer



@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    # Simulating authentication for demonstration without complex DB setup
    # In a real app, use Django's built-in User model and Groups
    if username == 'astronomer' and password == 'password':
        return Response({
            'username': 'astronomer',
            'role': 'Astronomer',
            'full_name': 'Dr. Alice Astronomer'
        })
    elif username == 'observer' and password == 'password':
        return Response({
            'username': 'observer',
            'role': 'Science Observer',
            'full_name': 'Bob Observer'
        })
    
    return Response(
        {"error": True, "message": "Invalid credentials. Use 'astronomer' or 'observer' with 'password'."},
        status=status.HTTP_401_UNAUTHORIZED
    )

class SciencePlanViewSet(viewsets.ModelViewSet):
    queryset = SciencePlan.objects.all()
    serializer_class = SciencePlanSerializer
    permission_classes = [permissions.AllowAny] # In real app, use role groups

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        role = self.request.query_params.get('role')
        
        if role == 'Astronomer' and user_id:
            return SciencePlan.objects.filter(astronomer_id=user_id)
        elif role == 'Science Observer':
            return SciencePlan.objects.filter(status=PlanStatus.SUBMITTED)
        
        return super().get_queryset()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        plan = self.get_object()
        
        # User-friendly check
        if plan.status not in [PlanStatus.DRAFT, PlanStatus.REVISED]:
            return Response(
                {"error": True, "message": f"Cannot submit plan. Current status is {plan.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notes = request.data.get('notes', '')
        plan.status = PlanStatus.SUBMITTED
        plan.submission_notes = notes
        plan.save()
        
        return Response(SciencePlanSerializer(plan).data)

    @action(detail=True, methods=['post'])
    def validate_plan(self, request, pk=None):
        plan = self.get_object()
        
        # User-friendly check
        if plan.status != PlanStatus.SUBMITTED:
             return Response(
                {"error": True, "message": "Only submitted plans can be validated."},
                status=status.HTTP_400_BAD_REQUEST
            )

        approve = request.data.get('approve', False)
        
        if approve:
            plan.status = PlanStatus.APPROVED
            plan.save()
            return Response(SciencePlanSerializer(plan).data)
        else:
            category = request.data.get('category')
            reason = request.data.get('reason', '')
            
            # User-friendly check for reason length
            if not reason or len(reason) < 50:
                return Response(
                    {"error": True, "message": "Please provide a detailed rejection reason (at least 50 characters)."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Convert string category to choice if needed
            if category:
                 plan.rejection_category = category
            
            plan.status = PlanStatus.REJECTED
            plan.rejection_reason = reason
            plan.save()
            
            return Response(SciencePlanSerializer(plan).data)

    @action(detail=False, methods=['get'])
    def queue(self, request):
        plans = SciencePlan.objects.filter(status=PlanStatus.SUBMITTED)
        serializer = self.get_serializer(plans, many=True)
        return Response(serializer.data)
