import uuid

from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.utils.translation import gettext_lazy as _
from django.db import models


class UserManager(DjangoUserManager):
    def _create_user(self, identifier, email, password, **extra_fields):
        identifier_value = identifier or uuid.uuid4().hex
        identifier_value = self.model.normalize_username(identifier_value)
        email_normalized = self.normalize_email(email)
        user = self.model(email=email_normalized, **extra_fields)
        setattr(user, self.model.USERNAME_FIELD, identifier_value)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError("The username must be set")
        extra_fields.setdefault("username", username)
        identifier = extra_fields.pop("identifier", None)
        return self._create_user(identifier, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError("The username must be set")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("username", username)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        identifier = extra_fields.pop("identifier", None)
        return self._create_user(identifier, email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model allowing future extensions."""

    identifier = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    username = models.CharField(
        _("username"),
        max_length=150,
        unique=False,
        help_text=_("Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only."),
        validators=[UnicodeUsernameValidator()],
    )

    USERNAME_FIELD = "identifier"
    REQUIRED_FIELDS = ["username", "email"]
    objects = UserManager()

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self):
        if self.username:
            return self.username
        if self.get_full_name():
            return self.get_full_name()
        return str(self.identifier)
