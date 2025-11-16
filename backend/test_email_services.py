from azure.communication.email import EmailClient
from datetime import datetime


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


def main():
    try:
        connection_string = "endpoint=endpoint=https://zpi-uniorg-communication-service.europe.communication.azure.com/;accesskey=9peONHoxA3Zcl2sNu7fq74fEJvWyPNV9E1qbf6V6VcJCUrA8QmgRJQQJ99BKACULyCpTNnCJAAAAAZCSA7LK"
        client = EmailClient.from_connection_string(connection_string)

        # Mock user data
        username = "john.doe-test123"
        password = "TempPass@2025#Secure"
        organization_name = "Acme Corp"

        message = {
            "senderAddress": "DoNotReply@3af5f752-8655-4840-b541-10927c5794da.azurecomm.net",
            "recipients": {
                "to": [{"address": "<INPUT MAIL>"}]
            },
            "content": {
                "subject": _render_subject(organization_name),
                "plainText": _render_plain(username, password),
                "html": _render_html(username, password)
            }
        }

        poller = client.begin_send(message)
        result = poller.result()
        print(result)
        print("Message sent: ", result.get('id'))

    except Exception as ex:
        print(ex)


if __name__ == "__main__":
    main()