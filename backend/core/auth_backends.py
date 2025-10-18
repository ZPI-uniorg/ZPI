import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class UsernameOrIdentifierBackend(ModelBackend):
    """Allow staff users to authenticate via username in addition to identifier."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        UserModel = get_user_model()
        candidates = []

        # Try to treat the username as a UUID identifier first.
        try:
            identifier = uuid.UUID(str(username))
        except (ValueError, AttributeError, TypeError):
            identifier = None
        else:
            candidates.append(
                UserModel.objects.filter(identifier=identifier).first()
            )

        if not any(candidates):
            staff_qs = UserModel.objects.filter(username__iexact=username, is_staff=True)
            candidates.extend(staff_qs)

        for candidate in filter(None, candidates):
            if candidate.check_password(password) and self.user_can_authenticate(candidate):
                return candidate

        return None
