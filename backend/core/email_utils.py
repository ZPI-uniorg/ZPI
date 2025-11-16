import logging

from django.conf import settings
from datetime import datetime

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
    # Inline styles for broad email client support (mirrors app dark theme)
    login_url = "https://zealous-pond-01ec7c503.3.azurestaticapps.net/login"
    return f"""
<!DOCTYPE html>
<html lang='pl'>
    <head>
        <meta charset='UTF-8' />
        <meta name='viewport' content='width=device-width,initial-scale=1' />
        <title>Twoje konto w UniOrg</title>
        <style>
            :root {{ color-scheme: dark; }}
            body {{ margin:0; padding:0; background:#0f172a; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#f8fafc; }}
            .wrapper {{ width:100%; background:#0f172a; padding:24px 0; }}
            .container {{ max-width:560px; margin:0 auto; background:#1e293b; border:1px solid #334155; border-radius:12px; padding:32px 40px; box-shadow:0 4px 12px rgba(0,0,0,0.4); }}
            h1 {{ font-size:24px; margin:0 0 16px; letter-spacing:0.5px; color:#f8fafc; }}
            p {{ line-height:1.55; margin:0 0 16px; color:#e2e8f0; }}
            ul {{ list-style:none; padding:0; margin:0 0 24px; }}
            li {{ margin:4px 0; font-size:15px; color:#e2e8f0; }}
            strong {{ color:#f8fafc; }}
            .kbd {{ display:inline-block; background:#0f172a; padding:4px 10px; border:1px solid #475569; border-radius:6px; font-family: 'Courier New', monospace; font-size:14px; letter-spacing:0.5px; color:#cbd5e1; }}
            .btn {{ display:inline-block; background:#3b82f6; color:#f8fafc !important; text-decoration:none; padding:14px 24px; border-radius:8px; font-weight:600; letter-spacing:0.5px; box-shadow:0 2px 6px rgba(0,0,0,0.35); }}
            .btn:hover {{ background:#2563eb; }}
            .footer {{ font-size:12px; color:#94a3b8; margin-top:32px; line-height:1.4; }}
            .divider {{ height:1px; background:#334155; border:none; margin:32px 0; }}
            @media (max-width:600px) {{ .container {{ padding:28px 24px; }} h1 {{ font-size:21px; }} }}
        </style>
    </head>
    <body>
        <div class='wrapper'>
            <div class='container'>
                <h1>Witaj w UniOrg</h1>
                <p>Twoje konto zostało utworzone. Użyj poniższych danych aby się zalogować i <strong>jak najszybciej zmień hasło</strong>.</p>
                <ul>
                    <li><strong>Login:</strong> <span class='kbd'>{username}</span></li>
                    <li><strong>Hasło tymczasowe:</strong> <span class='kbd'>{password}</span></li>
                </ul>
                <p style='margin-bottom:28px;'>Kliknij przycisk poniżej aby przejść do ekranu logowania aplikacji.</p>
                <p><a href='{login_url}' class='btn' target='_blank' rel='noopener'>Przejdź do logowania</a></p>
                <hr class='divider' />
                <p>Jeżeli przycisk nie działa, skopiuj ten adres URL:<br /><span class='kbd' style='word-break:break-all'>{login_url}</span></p>
                <div class='footer'>
                    <p>Ta wiadomość została wygenerowana automatycznie przez UniOrg. Proszę nie odpowiadać.</p>
                    <p>© {datetime.utcnow().year} UniOrg</p>
                </div>
            </div>
        </div>
    </body>
</html>
"""


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
    logger.warning(
        "send_new_user_credentials_email called: recipient_email=%s username=%s organization=%s",
        recipient_email,
        username,
        organization_name,
    )
    if not recipient_email:
        logger.warning("Skipping credential email - recipient missing")
        return False
    # uncomment to enable acs sending
    # if _send_via_acs(recipient_email, username, password, organization_name):
    #     return True
    # Final failure already logged with details inside _send_via_acs
    logger.error("ACS email failed for %s (see previous error for details)", recipient_email)
    return False
