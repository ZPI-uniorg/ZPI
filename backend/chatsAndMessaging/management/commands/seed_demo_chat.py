from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from chatsAndMessaging.models import Chat

class Command(BaseCommand):
    help = "Seed a demo chat with some participants if it does not already exist."

    def add_arguments(self, parser):
        parser.add_argument("--title", default="General", help="Title for the demo chat")
        parser.add_argument("--users", nargs="*", default=None, help="User identifiers (UUID or numeric id) to add; defaults to first 3 users.")

    def handle(self, *args, **options):
        title = options["title"]
        User = get_user_model()
        chat, created = Chat.objects.get_or_create(title=title)
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created chat '{title}' (id={chat.id})"))
        else:
            self.stdout.write(self.style.WARNING(f"Chat '{title}' already exists (id={chat.id})"))

        if options["users"]:
            users = []
            for ident in options["users"]:
                try:
                    # Try UUID identifier lookup
                    user = User.objects.filter(identifier=ident).first() or User.objects.filter(pk=ident).first()
                except Exception:
                    user = None
                if user:
                    users.append(user)
                else:
                    self.stdout.write(self.style.WARNING(f"User not found: {ident}"))
        else:
            users = list(User.objects.order_by("id")[:3])

        if not users:
            self.stdout.write(self.style.ERROR("No users found to attach."))
            return

        for u in users:
            chat.participants.add(u)
        chat.save()
        self.stdout.write(self.style.SUCCESS(f"Participants now: {[str(u) for u in chat.participants.all()]}"))
