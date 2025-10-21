from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create or update a development superuser with username/password admin/admin."

    def handle(self, *args, **options):
        User = get_user_model()

        user = (
            User.objects.filter(username__iexact="admin", is_staff=True)
            .order_by("id")
            .first()
        )

        if user:
            created = False
            self.stdout.write("Updating existing admin user.")
            user.username = "admin"
            user.email = user.email or "admin@example.com"
            user.is_staff = True
            user.is_superuser = True
            user.set_password("admin")
            user.save()
        else:
            self.stdout.write("Creating admin user.")
            user = User.objects.create_superuser(
                username="admin",
                email="admin@example.com",
                password="admin",
            )
            created = True

        identifier = getattr(user, "identifier", None)
        if created:
            self.stdout.write(self.style.SUCCESS("Admin superuser created."))
        else:
            self.stdout.write(self.style.SUCCESS("Admin superuser updated."))
        if identifier:
            self.stdout.write(f"Identifier: {identifier}")
        self.stdout.write(self.style.SUCCESS("Credentials -> username: admin, password: admin"))
