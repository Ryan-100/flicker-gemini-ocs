from rest_framework import serializers
from .models import (
    SciencePlan, Target, ObservingConditions, ExposureSettings, 
    Filter, DataProcessingReqs, ImageProcessingSpec, SchedulingConstraints,
    PlanStatus, RejectionCategory
)
import re

class TargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Target
        fields = ['name', 'ra', 'dec', 'magnitude', 'object_type']

    def validate_ra(self, value):
        # Diagram UC-1 step 6: System validates coordinate format
        if not re.match(r'^\d{2}:\d{2}:\d{2}\.\d$', value):
            raise serializers.ValidationError("RA must be in HH:MM:SS.S format.")
        return value

    def validate_dec(self, value):
        # Diagram UC-1 step 6: System validates coordinate format
        if not re.match(r'^[+-]?\d{2}:\d{2}:\d{2}\.\d$', value):
            raise serializers.ValidationError("Dec must be in [+/-]DD:MM:SS.S format.")
        return value

class ObservingConditionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObservingConditions
        fields = ['seeing', 'cloud_cover', 'water_vapor']

    def validate_seeing(self, value):
        # Diagram UC-1 step 10: System validates conditions against instrument limits
        if value < 0.3 or value > 3.0:
            raise serializers.ValidationError("Seeing must be between 0.3 and 3.0 arcsec.")
        return value

    def validate_cloud_cover(self, value):
        # Diagram UC-1 step 10: System validates conditions against instrument limits
        if value < 0 or value > 100:
            raise serializers.ValidationError("Cloud cover must be between 0 and 100%.")
        return value

    def validate_water_vapor(self, value):
        # Diagram UC-1 step 10: System validates conditions against instrument limits
        if value < 0 or value > 100:
            raise serializers.ValidationError("Water vapor must be between 0 and 100%.")
        return value

class FilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filter
        fields = ['name']

class ExposureSettingsSerializer(serializers.ModelSerializer):
    filters = FilterSerializer(many=True)

    class Meta:
        model = ExposureSettings
        fields = ['exp_time', 'num_exposures', 'filters', 'total_time']

    def validate(self, data):
        # Diagram UC-1 step 12: System calculates estimated observation duration
        exp_time = data.get('exp_time', 0)
        num_exposures = data.get('num_exposures', 0)
        total = exp_time * num_exposures
        data['total_time'] = total
        # Diagram UC-1 step 12a: Duration exceeds recommended limits warning (>1 hour = 3600s)
        # The warning is surfaced in the API response rather than blocking submission
        return data

class ImageProcessingSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageProcessingSpec
        fields = ['color_mode', 'contrast', 'brightness', 'saturation']

class DataProcessingReqsSerializer(serializers.ModelSerializer):
    image_proc = ImageProcessingSpecSerializer()

    class Meta:
        model = DataProcessingReqs
        fields = ['file_type', 'file_quality', 'image_proc']

    def validate_file_type(self, value):
        # Diagram UC-1 step 14: System validates data specifications against Gemini OCS standards
        allowed = ['FITS', 'TIFF', 'JPEG']
        if value not in allowed:
            raise serializers.ValidationError(f"File type must be one of: {', '.join(allowed)}.")
        return value

# Diagram UC-1 step 15: Astronomer adds optional scheduling constraints
class SchedulingConstraintsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchedulingConstraints
        fields = ['date_start', 'date_end', 'priority', 'time_window_notes']
        # All fields optional per diagram ("Optional" label on diagram node)

    def validate(self, data):
        # Diagram UC-1 step 16: System validates constraints against telescope scheduling rules
        date_start = data.get('date_start')
        date_end = data.get('date_end')
        if date_start and date_end and date_end < date_start:
            raise serializers.ValidationError(
                "End date must be on or after start date."
            )
        return data

class SciencePlanSerializer(serializers.ModelSerializer):
    target = TargetSerializer()
    conditions = ObservingConditionsSerializer()
    exposure = ExposureSettingsSerializer()
    data_proc = DataProcessingReqsSerializer()
    # Diagram UC-1 step 15: optional scheduling constraints
    scheduling = SchedulingConstraintsSerializer(required=False, allow_null=True)

    class Meta:
        model = SciencePlan
        fields = [
            'id', 'astronomer_id', 'created_at', 'status',
            'instrument',                 # Diagram UC-1 step 7: instrument selection
            'submission_notes', 'rejection_category', 'rejection_reason',
            'clarification_questions',    # Diagram UC-3 15b: clarification request
            'target', 'conditions', 'exposure', 'data_proc', 'scheduling'
        ]
        read_only_fields = ['id', 'created_at', 'status', 'rejection_category', 'rejection_reason',
                            'clarification_questions']

    def create(self, validated_data):
        target_data = validated_data.pop('target')
        conditions_data = validated_data.pop('conditions')
        exposure_data = validated_data.pop('exposure')
        filters_data = exposure_data.pop('filters')
        data_proc_data = validated_data.pop('data_proc')
        image_proc_data = data_proc_data.pop('image_proc')
        # Diagram UC-1 step 15: scheduling constraints are optional
        scheduling_data = validated_data.pop('scheduling', None)

        # Diagram UC-1 step 20: System assigns unique plan ID and saves to database
        plan = SciencePlan.objects.create(**validated_data)

        Target.objects.create(plan=plan, **target_data)
        ObservingConditions.objects.create(plan=plan, **conditions_data)

        exposure = ExposureSettings.objects.create(plan=plan, **exposure_data)
        for f in filters_data:
            Filter.objects.create(exposure=exposure, **f)

        data_proc = DataProcessingReqs.objects.create(plan=plan, **data_proc_data)
        ImageProcessingSpec.objects.create(data_proc=data_proc, **image_proc_data)

        # Diagram UC-1 step 15: persist scheduling constraints if provided
        if scheduling_data:
            SchedulingConstraints.objects.create(plan=plan, **scheduling_data)

        return plan

    def validate_rejection_reason(self, value):
        # Diagram UC-3 15a5: System validates comment box ≥50 characters
        if self.instance and self.instance.status == PlanStatus.REJECTED:
             if not value or len(value) < 50:
                 raise serializers.ValidationError("Please provide a rejection reason of at least 50 characters.")
        return value
