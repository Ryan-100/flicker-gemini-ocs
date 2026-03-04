from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid

class PlanStatus(models.TextChoices):
    DRAFT = "Draft", _("Draft")
    SUBMITTED = "Submitted", _("Submitted")
    CLARIFICATION_REQUESTED = "Clarification Requested", _("Clarification Requested")
    REVISED = "Revised", _("Revised")
    APPROVED = "Approved", _("Approved")
    REJECTED = "Rejected", _("Rejected")
    CONVERTED_TO_PROGRAM = "Converted to Program", _("Converted to Program")

class RejectionCategory(models.TextChoices):
    TECHNICAL = "Technical Infeasibility", _("Technical Infeasibility")
    SCIENTIFIC = "Scientific Merit Issues", _("Scientific Merit Issues")
    SCHEDULING = "Scheduling Conflict", _("Scheduling Conflict")
    INCOMPLETE = "Incomplete Information", _("Incomplete Information")
    CONDITIONS = "Observing Conditions Unrealistic", _("Observing Conditions Unrealistic")
    DATA_SPEC = "Data Specification Issues", _("Data Specification Issues")
    INSTRUMENT = "Instrument Configuration Problem", _("Instrument Configuration Problem")
    OTHER = "Other", _("Other")

class SciencePlan(models.Model):
    id = models.CharField(primary_key=True, max_length=100, default=uuid.uuid4)
    astronomer_id = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=50,
        choices=PlanStatus.choices,
        default=PlanStatus.DRAFT
    )
    instrument = models.CharField(max_length=100, null=True, blank=True)
    submission_notes = models.TextField(null=True, blank=True)
    rejection_category = models.CharField(
        max_length=100,
        choices=RejectionCategory.choices,
        null=True,
        blank=True
    )
    rejection_reason = models.TextField(null=True, blank=True)
    # Diagram UC-3 15b: Clarification Requested flow
    clarification_questions = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Plan {self.id} - {self.status}"

class Target(models.Model):
    plan = models.OneToOneField(SciencePlan, on_delete=models.CASCADE, related_name='target')
    name = models.CharField(max_length=255)
    ra = models.CharField(max_length=50) # In format HH:MM:SS.S
    dec = models.CharField(max_length=50) # In format DD:MM:SS.S
    magnitude = models.FloatField()
    object_type = models.CharField(max_length=100)

class ObservingConditions(models.Model):
    plan = models.OneToOneField(SciencePlan, on_delete=models.CASCADE, related_name='conditions')
    seeing = models.FloatField()
    cloud_cover = models.IntegerField()
    water_vapor = models.IntegerField()

class ExposureSettings(models.Model):
    plan = models.OneToOneField(SciencePlan, on_delete=models.CASCADE, related_name='exposure')
    exp_time = models.FloatField()
    num_exposures = models.IntegerField()
    total_time = models.FloatField(null=True, blank=True)

class Filter(models.Model):
    exposure = models.ForeignKey(ExposureSettings, on_delete=models.CASCADE, related_name='filters')
    name = models.CharField(max_length=50)

class DataProcessingReqs(models.Model):
    plan = models.OneToOneField(SciencePlan, on_delete=models.CASCADE, related_name='data_proc')
    file_type = models.CharField(max_length=50, default="FITS")
    file_quality = models.CharField(max_length=50, default="High")

class ImageProcessingSpec(models.Model):
    data_proc = models.OneToOneField(DataProcessingReqs, on_delete=models.CASCADE, related_name='image_proc')
    color_mode = models.CharField(max_length=50, default="B&W")
    contrast = models.IntegerField(default=50)
    brightness = models.IntegerField(default=50)
    saturation = models.IntegerField(default=50)

# Diagram UC-1 step 15: Add Scheduling Constraints (optional)
class SchedulingConstraints(models.Model):
    plan = models.OneToOneField(SciencePlan, on_delete=models.CASCADE, related_name='scheduling', null=True, blank=True)
    date_start = models.DateField(null=True, blank=True)          # Earliest observation date
    date_end = models.DateField(null=True, blank=True)            # Latest observation date
    priority = models.IntegerField(default=1)                     # 1=High, 2=Medium, 3=Low
    time_window_notes = models.TextField(null=True, blank=True)   # Free-text time window description

    def is_achievable(self):
        """Check that date range is valid (date_end > date_start)"""
        if self.date_start and self.date_end:
            return self.date_end >= self.date_start
        return True
