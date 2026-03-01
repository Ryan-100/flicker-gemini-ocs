from rest_framework import serializers
from .models import (
    SciencePlan, Target, ObservingConditions, ExposureSettings, 
    Filter, DataProcessingReqs, ImageProcessingSpec, PlanStatus, RejectionCategory
)
import re

class TargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Target
        fields = ['name', 'ra', 'dec', 'magnitude', 'object_type']

    def validate_ra(self, value):
        # Format: HH:MM:SS.S
        if not re.match(r'^\d{2}:\d{2}:\d{2}\.\d$', value):
            raise serializers.ValidationError("RA must be in HH:MM:SS.S format.")
        return value

    def validate_dec(self, value):
        # Format: [+/-]DD:MM:SS.S
        if not re.match(r'^[+-]?\d{2}:\d{2}:\d{2}\.\d$', value):
            raise serializers.ValidationError("Dec must be in [+/-]DD:MM:SS.S format.")
        return value

class ObservingConditionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObservingConditions
        fields = ['seeing', 'cloud_cover', 'water_vapor']

class FilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filter
        fields = ['name']

class ExposureSettingsSerializer(serializers.ModelSerializer):
    filters = FilterSerializer(many=True)

    class Meta:
        model = ExposureSettings
        fields = ['exp_time', 'num_exposures', 'filters', 'total_time']

class ImageProcessingSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageProcessingSpec
        fields = ['color_mode', 'contrast', 'brightness', 'saturation']

class DataProcessingReqsSerializer(serializers.ModelSerializer):
    image_proc = ImageProcessingSpecSerializer()

    class Meta:
        model = DataProcessingReqs
        fields = ['file_type', 'file_quality', 'image_proc']

class SciencePlanSerializer(serializers.ModelSerializer):
    target = TargetSerializer()
    conditions = ObservingConditionsSerializer()
    exposure = ExposureSettingsSerializer()
    data_proc = DataProcessingReqsSerializer()

    class Meta:
        model = SciencePlan
        fields = [
            'id', 'astronomer_id', 'created_at', 'status', 
            'submission_notes', 'rejection_category', 'rejection_reason',
            'target', 'conditions', 'exposure', 'data_proc'
        ]
        read_only_fields = ['id', 'created_at', 'status', 'rejection_category', 'rejection_reason']

    def create(self, validated_data):
        target_data = validated_data.pop('target')
        conditions_data = validated_data.pop('conditions')
        exposure_data = validated_data.pop('exposure')
        filters_data = exposure_data.pop('filters')
        data_proc_data = validated_data.pop('data_proc')
        image_proc_data = data_proc_data.pop('image_proc')

        plan = SciencePlan.objects.create(**validated_data)
        
        Target.objects.create(plan=plan, **target_data)
        ObservingConditions.objects.create(plan=plan, **conditions_data)
        
        exposure = ExposureSettings.objects.create(plan=plan, **exposure_data)
        for f in filters_data:
            Filter.objects.create(exposure=exposure, **f)
            
        data_proc = DataProcessingReqs.objects.create(plan=plan, **data_proc_data)
        ImageProcessingSpec.objects.create(data_proc=data_proc, **image_proc_data)
        
        return plan

    def validate_rejection_reason(self, value):
        if self.instance and self.instance.status == PlanStatus.REJECTED:
             if not value or len(value) < 50:
                 raise serializers.ValidationError("Please provide a rejection reason of at least 50 characters.")
        return value
