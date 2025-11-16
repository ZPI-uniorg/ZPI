import logging

from django.conf import settings

try:
    from azure.communication.email import EmailClient
    from azure.core.exceptions import AzureError
except ImportError:  # pragma: no cover
    EmailClient = None  # type: ignore
    AzureError = Exception  # type: ignore

logger = logging.getLogger(__name__)


def _extract_message_id(result: object) -> str | None:
    if isinstance(result, dict):
        for key in ("id", "message_id", "messageId"):
            value = result.get(key)  # type: ignore[arg-type]
            if value:
                return value  # type: ignore[return-value]
        return None
    for attr in ("id", "message_id", "messageId"):
        value = getattr(result, attr, None)
        if value:
            return value  # type: ignore[return-value]
    return None


def _render_subject(organization_name: str) -> str:
    return f"Twoje konto w {organization_name}"


def _render_plain(username: str, password: str) -> str:
    return (
        "Czesc!\n\n"
        "Twoje konto w aplikacji UniOrg zostalo utworzone.\n"
        f"Login: {username}\n"
        f"Haslo: {password}\n\n"
        "Po zalogowaniu pamietaj, aby ustawic wlasne haslo.\n"
        "Pozdrawiamy,\nZespol UniOrg"
    )


def _render_html(username: str, password: str) -> str:
    return (
        "<h2>Twoje konto w UniOrg</h2>"
        "<p>Twoje konto zostalo utworzone. Oto dane logowania:</p>"
        f"<ul><li><strong>Login:</strong> {username}</li>"
        f"<li><strong>Haslo tymczasowe:</strong> {password}</li></ul>"
        "<p>Zaloguj sie i zmien haslo przy pierwszej okazji.</p>"
        "<p>Pozdrawiamy,<br/>Zespol UniOrg</p>"
    )


def _send_via_acs(recipient_email: str, username: str, password: str, organization_name: str) -> bool:
    if EmailClient is None:
        logger.error("Azure Communication EmailClient not available (package missing)")
        return False
    connection_string = getattr(settings, "AZURE_COMMUNICATION_CONNECTION_STRING", "")
    sender = getattr(settings, "AZURE_COMMUNICATION_SENDER_EMAIL", "")
    if not connection_string or not sender:
        logger.error(
            "Missing ACS credentials: connection_string_present=%s sender_present=%s",
            bool(connection_string),
            bool(sender),
        )
        return False
    client = EmailClient.from_connection_string(connection_string)
    subject = _render_subject(organization_name)
    plain = _render_plain(username, password)
    html = _render_html(username, password)
    message = {
        "senderAddress": sender,
        "recipients": {"to": [{"address": recipient_email}]},
        "content": {"subject": subject, "plainText": plain, "html": html},
    }
    try:
        poller = client.begin_send(message)
        result = poller.result()
        message_id = _extract_message_id(result)
        logger.info(
            "Credential email queued via ACS to %s message_id=%s raw_result=%s",
            recipient_email,
            message_id or "<unknown>",
            result,
        )
        return True
    except AzureError as exc:  # type: ignore
        logger.error("ACS send failure for %s: %s", recipient_email, exc, exc_info=True)
        return False


def send_new_user_credentials_email(
    recipient_email: str,
    username: str,
    password: str,
    organization_name: str,
) -> bool:
    if not recipient_email:
        logger.warning("Skipping credential email - recipient missing")
        return False
    if _send_via_acs(recipient_email, username, password, organization_name):
        return True
    # Final failure already logged with details inside _send_via_acs
    logger.error("ACS email failed for %s (see previous error for details)", recipient_email)
    return False
