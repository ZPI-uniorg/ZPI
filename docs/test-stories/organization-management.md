# Scenariusze End-to-End zarządzania organizacją

Poniższe scenariusze opisują przepływy end-to-end obejmujące główne funkcje administracji organizacyjnej.

---

## Historia 1 – Zarejestrowanie nowej organizacji

1. **Otwórz formularz rejestracji**
   - Przejdź do publicznej strony rejestracji (np. `/register-organization`).
   - Sprawdź, czy wszystkie pola (nazwa organizacji, opcjonalny opis, dane logowania administratora) są widoczne i włączone.
2. **Prześlij szczegóły organizacji przez interfejs**
   - Wypełnij formularz przykładowymi danymi:
     - Nazwa organizacji: `Hate Driven Development Club`
     - Opis: `Internal tools for the UniOrg ecosystem.`
     - Dane logowania administratora:
       - Login: `hdd-root`
       - Hasło: `StrongPass!123`
       - E-mail: `root@example.com`
       - Imię: `Root`
       - Nazwisko: `Admin`
   - Wciśnij przycisk **Utwórz** / **Register**.
3. **Sprawdź zwrotną informację**
   - Oczekuj ekranu potwierdzenia lub powiadomienia (toast) podsumowującego utworzenie organizacji.
   - Skopiuj tokeny lub wskazówki logowania, które interfejs wyświetli dla nowego administratora (jeśli pokażą się tylko raz).
4. **Zweryfikuj doświadczenie po zalogowaniu**
   - Powinieneś być automatycznie zalogowany jako nowo utworzony administrator i przekierowany do pulpitu nawigacyjnego.
5. **Zbierz dowody**
   - Zrób zrzut ekranu stanu potwierdzenia i zanotuj dane logowania administratora do dalszych scenariuszy.

---

## Historia 2 – Zarejestrowanie członków zespołu

> Warunek wstępny: Historia 1 ukończona; pozostajesz zalogowany(a) jako administrator główny.

1. **Otwórz zarządzanie organizacją**
   - Z nawigacji globalnej wybierz **Członkowie** / **Organizations**.
   - Potwierdź, że tabela członków zawiera administratora (rola `Administrator`).
2. **Dodaj koordynatora**
   - Kliknij **Dodaj nowego członka**.
   - W oknie dialogowym/panelu:
     - Ustaw login: `coordinator.one`.
     - Wygeneruj bezpieczne hasło i skopiuj je.
     - Wpisz e-mail `coordinator1@example.com` i nazwę `Casey Coordinator`.
     - Wybierz rolę `Koordynator`.
     - Prześlij.
   - Sprawdź powiadomienie o sukcesie i czy nowy koordynator pojawił się w tabeli.
3. **Dodaj dwóch zwykłych członków**
   - Powtórz ten sam przepływ interfejsu dwukrotnie dla `member.one` i `member.two` z rolą `Członek`.
   - Zanotuj wygenerowane hasła dokładnie tak, jak są wyświetlane (nie będą już dostępne).
4. **Zweryfikuj listę członków w interfejsie**
   - Potwierdź, że lista teraz pokazuje czterech użytkowników z poprawnymi rolami i e-mailami.
   - Opcjonalnie filtruj/przeszukaj, aby upewnić się, że dane tabeli są interaktywne.
5. **Przechowaj dane logowania**
   - Zapisz nazwy użytkowników i hasła tymczasowe do użytku w kolejnych historiach.

---

## Historia 3 – Dystrybuowanie danych logowania przez powiadomienia e-mail

> Cel: Upewnienie się, że nowi członkowie otrzymują swoje dane logowania.

1. **Sprawdź wysyłanie e-maili**
   - Monitoruj skonfigurowaną testową skrzynkę pocztową lub mail catcher bezpośrednio po utworzeniu każdego członka.
   - Alternatywnie, wyzwól akcję "Wyślij dane logowania" z wiersza członka, jeśli jest dostępna.
2. **Przegląd zawartości wiadomości**
   - Temat powinien zawierać nazwę organizacji.
   - Treść zawiera adres URL logowania (`/login`), login, hasło tymczasowe i instrukcję zmiany hasła.
   - Linki powinny być klikalne i kierować do prawidłowego środowiska.
3. **Archiwizuj dowody**
   - Zapisz e-mail jako `.eml` lub zrób zrzut ekranu dla rejestrów audytu.

---

## Historia 4 – Uwierzytelnianie się jako każda rola

> Użyj przechowywanych danych logowania z wcześniejszych historii.

1. **Zaloguj się jako administrator główny**
   - Otwórz `/login` w nowej sesji lub oknie incognito.
   - Wpisz slug organizacji, login `hdd-root` i przechowywane hasło.
   - Zweryfikuj przekierowanie do `/dashboard` i obecność kontrolek administratora (np. tabela członków, przyciski "nowy projekt/tag").
2. **Zaloguj się jako koordynator**
   - Wyloguj się, a następnie zaloguj jako `coordinator.one`.
   - Potwierdź, że pulpit nawigacyjny ładuje się i pokazuje kontrolki poziomu koordynatora (np. możliwość zarządzania tagami/projektami, ale nie usuwania administratora).
3. **Zaloguj się jako member.one i member.two**
   - Powtórz przepływ dla każdego członka.
   - Upewnij się, że mogą widzieć zawartość pulpitu nawigacyjnego, ale nie widzą akcji administracyjnych (np. wyłączone formularze dodawania członków).
4. **Zanotuj obserwacje**
   - Odnotuj wszelkie rozbieżności w uprawnieniach lub widoczności interfejsu między rolami.

---

## Historia 5 – Wymuszenie polityki zmiany hasła

> Zwaliduj punkt końcowy zmiany hasła i zalogowanie się ze zaktualizowanym hasłem.

1. **Zaloguj się jako coordinator.one za pomocą oryginalnego hasła**.
2. **Otwórz formularz zmiany hasła**
   - Z avatara / rogu profilu wybierz **Profil** lub przejdź bezpośrednio do `/account/password`.
   - Wypełnij formularz hasłem aktualnym `CoordPass!456` i nowym hasłem `CoordPass!Updated789`.
   - Prześlij i czekaj na alert powodzenia.
3. **Zaloguj się ponownie**
   - Spróbuj zalogować się ze starym hasłem (oczekuj odrzucenia).
   - Zaloguj się przy nowym haśle (oczekuj powodzenia).
4. **Powtórz dla member.one** (opcjonalne, ale zalecane dla pełnego pokrycia).
5. **Udokumentuj błędy walidacji** (np. odrzucenie słabego hasła).

---

## Historia 6 – Utworzenie projektu i przydzielenie członków zespołu

1. **Utwórz projekt organizacyjny (interfejs)**
   - Podczas gdy jesteś zalogowany(a) jako administrator lub koordynator, otwórz pasek boczny pulpitu nawigacyjnego i kliknij **nowy projekt**.
   - Uzupełnij formularz projektu:
     - Nazwa: `Alpha Launch`
     - Opis: `Initial release backlog`
     - Daty zgodnie z planem
     - Przydziel koordynatora `coordinator.one`
   - Prześlij i potwierdź wiadomość o powodzeniu.
2. **Powiąż członków**
   - Użyj interfejsu zarządzania projektami/tagami, aby przydzielić `member.one` i `member.two` do odpowiednich tagów lub ról.
   - Upewnij się, że każde dodanie pokazuje potwierdzenie.
3. **Potwierdź widoczność projektu**
   - Wróć do widoku pulpitu nawigacyjnego i filtruj czaty/kanban po nowym tagu projektu.
   - Zweryfikuj, że board kanban / kalendarz ujawnia wpisy projektu, jeśli dotyczy.

---

## Historia 7 – Usuwanie członków z projektu / organizacji

1. **Obniż rangę koordynatora do członka**
   - W tabeli członków zlokalizuj `coordinator.one`.
   - Użyj rozwijana menu ról, aby zmienić z `Koordynator` na `Członek`.
   - Potwierdź zmianę za pośrednictwem powiadomienia (toast) i odświeżonego wpisu tabeli.
2. **Usuń member.two z organizacji**
   - Kliknij akcję **Usuń** dla `member.two`.
   - Zaakceptuj okno dialogowe potwierdzenia.
   - Upewnij się, że wiersz znika bez błędów.
3. **Potwierdź listę członków i dostęp do projektu**
   - Tabela członków powinna teraz zawierać tylko administratora, koordynatora (jako członek) i member.one.
   - Sprawdź ekran zarządzania projektami/tagami, aby upewnić się, że member.two nie jest już przydzielony.
4. **Zwaliduj ograniczenie logowania**
   - Spróbuj zalogować się jako `member.two`; oczekuj odrzucenia lub pustej listy wyboru organizacji.

---

## Historia 8 – Logowanie audytu i zabezpieczenia administratora

1. **Upewnij się, że ostatni administrator jest chroniony**
   - Spróbuj zmienić rolę administratora na `Członek` lub usunąć wiersz administratora.
   - Zweryfikuj, że interfejs blokuje akcję przy pomocy komunikatu o błędzie.
2. **Zwaliduj dostęp oparty na rolach**
   - Podczas gdy jesteś zalogowany(a) jako zwykły członek, potwierdź, że przycisk **Dodaj** jest ukryty lub wyłączony.
   - Jako koordynator, spróbuj usunąć administratora; oczekuj ostrzeżenia o uprawnieniach.
3. **Przegląd dzienników / powiadomień**
   - Sprawdzić powiadomienia w aplikacji lub interfejs dziennika audytu (jeśli dostępne), aby upewnić się, że kluczowe zdarzenia są przechwytywane dla możliwości śledzenia.

---

## Uwagi do wykonania

- Dla wykonania ręcznego zanotuj zrzuty ekranów oraz ładunki i odpowiedzi API w repozytorium testowych dowodów.
- Dla automatyzacji przetłumacz każdy numerowany krok na wywołania API lub interakcje interfejsu użytkownika w Twoim frameworku testowym.
- Upewnij się, że zmienne środowiskowe (podstawowe adresy URL, dane logowania) są konfigurowalne dla środowisk staging/QA.
- Po ukończeniu zresetuj dane testowe lub uruchom fixture bazy danych, aby przywrócić stan bazowy.
