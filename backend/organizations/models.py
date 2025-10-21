from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="organizations_created",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def generate_unique_slug(self):
        base_slug = slugify(self.name) or "organization"
        slug_candidate = base_slug
        counter = 1
        while Organization.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
            counter += 1
            slug_candidate = f"{base_slug}-{counter}"
        self.slug = slug_candidate

    def save(self, *args, **kwargs):
        if not self.slug:
            self.generate_unique_slug()
        super().save(*args, **kwargs)


class Membership(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        COORDINATOR = "coordinator", "Koordynator"
        MEMBER = "member", "Członek"

    organization = models.ForeignKey(
        Organization,
        related_name="memberships",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="memberships",
        on_delete=models.CASCADE,
    )
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.MEMBER)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="memberships_invited",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization", "user__username"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "user"], name="unique_membership"),
        ]

    def __str__(self):
        return f"{self.user} in {self.organization} ({self.role})"


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_dte = models.DateField()
    end_dte = models.DateField()
    organization = models.ForeignKey(Organization, related_name="projects", on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, related_name="projects", on_delete=models.CASCADE)
    coordinator = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="coordinated_projects", on_delete=models.SET_NULL, null=True)