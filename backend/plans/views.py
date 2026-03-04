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
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        role = self.request.query_params.get('role')

        if role == 'Astronomer' and user_id:
            return SciencePlan.objects.filter(astronomer_id=user_id)
        elif role == 'Science Observer':
            # Diagram UC-3 step 2: Science Observer sees plans in "Submitted" status
            return SciencePlan.objects.filter(status=PlanStatus.SUBMITTED)

        return super().get_queryset()

    # Diagram UC-2 steps 7-18: Submit Science Plan workflow
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        plan = self.get_object()

        # Diagram UC-2 step 8: pre-submission validation checks
        if plan.status not in [PlanStatus.DRAFT, PlanStatus.REVISED]:
            return Response(
                {"error": True, "message": f"Cannot submit plan. Current status is {plan.status}. Only Draft or Revised plans can be submitted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Diagram UC-2 step 8: validate required fields
        validation_errors = []
        try:
            if not plan.target:
                validation_errors.append("Target information is missing.")
        except Exception:
            validation_errors.append("Target information is missing.")

        try:
            if not plan.conditions:
                validation_errors.append("Observing conditions are missing.")
        except Exception:
            validation_errors.append("Observing conditions are missing.")

        try:
            if not plan.exposure:
                validation_errors.append("Exposure settings are missing.")
        except Exception:
            validation_errors.append("Exposure settings are missing.")

        try:
            if not plan.data_proc:
                validation_errors.append("Data processing specifications are missing.")
        except Exception:
            validation_errors.append("Data processing specifications are missing.")

        if validation_errors:
            return Response(
                {"error": True, "message": "Pre-submission validation failed.", "errors": validation_errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Diagram UC-2 step 9: all validation checks pass

        # Diagram UC-2 steps 12-13: optional notes, change status
        notes = request.data.get('notes', '')
        plan.status = PlanStatus.SUBMITTED
        plan.submission_notes = notes
        # Diagram UC-2 step 14: record submission timestamp (auto via updated_at / created_at)
        plan.save()

        # Diagram UC-2 step 15-16: add plan to validation queue (implicit via status filter) and notify
        # In production, this would enqueue a notification to Science Observers
        return Response(SciencePlanSerializer(plan).data)

    # Diagram UC-3: Validate Science Plan (approve or reject)
    @action(detail=True, methods=['post'])
    def validate_plan(self, request, pk=None):
        plan = self.get_object()

        # Diagram UC-3 precondition: plan must be in Submitted status
        if plan.status != PlanStatus.SUBMITTED:
             return Response(
                {"error": True, "message": "Only submitted plans can be validated."},
                status=status.HTTP_400_BAD_REQUEST
            )

        approve = request.data.get('approve', False)

        if approve:
            # Diagram UC-3 steps 16-25: Approve path
            # Step 19: status changes to Approved
            plan.status = PlanStatus.APPROVED
            # Step 20: record approval timestamp (auto handled by Django) and validator ID
            plan.save()
            # Step 21: notify astronomer (in production: NotificationService.notifyApproval())
            # Step 22: make plan available for conversion (status=Approved signals eligibility)
            # Step 24: remove from validation queue (implicit - queue filters by status=Submitted)
            return Response(SciencePlanSerializer(plan).data)
        else:
            category = request.data.get('category')
            reason = request.data.get('reason', '')

            # Diagram UC-3 15a5: System validates comment box ≥50 characters
            if not reason or len(reason) < 50:
                return Response(
                    {"error": True, "message": "Please provide a detailed rejection reason (at least 50 characters)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Diagram UC-3 15a8: status changes to Rejected
            if category:
                plan.rejection_category = category

            plan.status = PlanStatus.REJECTED
            # Diagram UC-3 15a9: record rejection details
            plan.rejection_reason = reason
            plan.save()
            # Diagram UC-3 15a10: send notification to Astronomer (in production: NotificationService.notifyRejection())
            # Diagram UC-3 15a12: remove from validation queue (implicit - queue filters by status=Submitted)
            return Response(SciencePlanSerializer(plan).data)

    # Diagram UC-3 15b: Request Clarification path
    @action(detail=True, methods=['post'])
    def request_clarification(self, request, pk=None):
        plan = self.get_object()

        if plan.status != PlanStatus.SUBMITTED:
            return Response(
                {"error": True, "message": "Only submitted plans can have clarification requested."},
                status=status.HTTP_400_BAD_REQUEST
            )

        questions = request.data.get('questions', '').strip()
        if not questions:
            return Response(
                {"error": True, "message": "Please provide clarification questions."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Diagram UC-3 15b5: Plan status changes to "Clarification Requested"
        plan.status = PlanStatus.CLARIFICATION_REQUESTED
        # Diagram UC-3 15b3: store the clarification questions
        plan.clarification_questions = questions
        plan.save()
        # Diagram UC-3 15b4: send clarification request to Astronomer (in production: NotificationService)

        return Response(SciencePlanSerializer(plan).data)

    # Diagram UC-3 step 2: get plans in validation queue
    @action(detail=False, methods=['get'])
    def queue(self, request):
        plans = SciencePlan.objects.filter(status=PlanStatus.SUBMITTED)
        serializer = self.get_serializer(plans, many=True)
        return Response(serializer.data)
