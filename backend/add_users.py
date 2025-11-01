import requests

# URL nowego punktu końcowego rejestracji
# Zakładając, że twoje URL-e z `core.urls` są pod prefiksem `/api/`
url = "http://127.0.0.1:8000/api/auth/register/"

# Dane użytkowników
users = [
    {
        "username": "user1",
        "password": "password1",
        "email": "user1@example.com"
    },
    {
        "username": "user2",
        "password": "password2",
        "email": "user2@example.com"
    },
    {
        "username": "user3",
        "password": "password3",
        "email": "user3@example.com"
    }
]

# Wysyłanie żądań POST w celu rejestracji użytkowników
for user in users:
    try:
        # Wysyłaj dane jako form-data
        response = requests.post(url, data=user)
        # Zgłoś wyjątek dla nieudanych żądań (status 4xx lub 5xx)
        response.raise_for_status()
        print(f"Użytkownik {user['username']} zarejestrowany pomyślnie. Odpowiedź: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"Rejestracja użytkownika {user['username']} nie powiodła się. Błąd: {e}")
        # Sprawdź, czy odpowiedź istnieje, zanim spróbujesz uzyskać dostęp do jej tekstu
        if 'response' in locals() and hasattr(response, 'text'):
            print(f"Treść odpowiedzi: {response.text}")
