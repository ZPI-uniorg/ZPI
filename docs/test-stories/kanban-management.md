# Scenariusze End-to-End zarządzania kanbanem

Poniższe scenariusze opisują przepływy end-to-end obejmujące główne funkcje tablicy kanban organizacyjnej.

## Uprawnienia do zarządzania zadaniami

- **Administrator**: Może tworzyć, edytować i usuwać zadania dla każdego projektu i każdego użytkownika.
- **Koordynator**: Może tworzyć, edytować i usuwać zadania dla swoich projektów, oraz zarządzać zadaniami członków przypisanych do tych projektów.
- **Zwykły członek**: Może tworzyć, edytować i usuwać tylko swoje własne zadania w projektach, do których ma dostęp.

## Pola zadania

Każde zadanie posiada następujące pola:
- **ID**: Unikalny identyfikator zadania (np. ALPHA-001, AUTO-GENERATED)
- **Opis**: Treść/tytuł zadania z opisem co należy zrobić
- **Data utworzenia**: Automatycznie ustawiana data dodania zadania
- **Deadline**: Data końcowa/termin wykonania zadania
- **Przydzielona osoba**: Użytkownik odpowiedzialny za wykonanie zadania

---

## Historia 1 – Tworzenie zadania dla siebie

> Warunek wstępny: Zalogowany jako koordynator/członek; istnieje co najmniej jeden projekt, do którego użytkownik ma dostęp.

1. **Otwórz moduł Kanban**
   - Z głównej nawigacji wybierz **Kanban** lub **Tablica** lub wejdź w projekt i wybierz **Widok kanban**.
   - Potwierdź, że widok pokazuje kolumny: **Backlog**, **Do zrobienia**, **W trakcie**, **Zrobione** (lub podobne).
3. **Utwórz nowe zadanie**
   - Kliknij przycisk **Nowe zadanie** lub **+ Dodaj** w kolumnie **Backlog**.
   - Wypełnij formularz:
     - Opis: `Implementacja logowania - dodanie formularza logowania z walidacją`
     - Projekt: Wybierz dostępny projekt (np. **Alpha Launch**)
     - Przydzielone do: Zaznacz siebie jako przydzielonego użytkownika
     - Deadline: `2025-01-30`
   - ID będzie automatycznie wygenerowane po zapisaniu.
3. **Zapisz zadanie**
   - Kliknij **Zapisz** / **Utwórz**.
   - Zweryfikuj powiadomienie (toast) o pomyślnym utworzeniu.
4. **Potwierdź widoczność w kanban**
   - Zadanie powinno pojawić się w kolumnie **Backlog**.
   - Twoja nazwa powinna być widoczna na karcie zadania.
5. **Zbierz dowody**
   - Zrób zrzut ekranu kanban z nowym zadaniem.

---

## Historia 2 – Koordynator tworzy zadanie dla członka zespołu

> Warunek wstępny: Historia 1 ukończona; zalogowany jako koordynator; istnieją członkowie w tym samym projekcie.
> 
> **Uprawnienia**: Koordynator może tworzyć zadania dla członków swoich projektów.

1. **Zaloguj się jako koordynator**
   - Upewnij się, że posiadasz rolę koordynatora w projekcie **Alpha Launch**.
2. **Otwórz Kanban dla projektu**
   - Przejdź do projektu **Alpha Launch** i otwórz widok kanban.
3. **Utwórz nowe zadanie dla członka**
   - Kliknij **Nowe zadanie**.
   - Wypełnij formularz:
     - Opis: `Testy jednostkowe dla modułu auth - napisz testy dla funkcji logowania`
     - Projekt: **Alpha Launch**
     - Przydzielone do: Wybierz członka zespołu (np. **John Doe**)
     - Deadline: `2025-01-28`
4. **Zapisz zadanie**
   - Kliknij **Zapisz**.
   - Potwierdź powiadomienie o sukcesie.
5. **Zweryfikuj przydzielenie**
   - Zadanie pojawia się w kanban.
   - Nazwa przydzielonego członka powinna być widoczna na karcie.
   - Członek powinien otrzymać powiadomienie (opcjonalne).
6. **Sprawdź z perspektywy członka**
   - Zaloguj się jako przydzielony członek.
   - Potwierdź, że widzi zadanie przydzielone przez koordynatora.
7. **Zbierz dowody**
   - Zrób zrzuty ekranu z perspektywy koordynatora i członka.

---

## Historia 3 – Członek próbuje utworzyć zadanie dla innego członka

> Warunek wstępny: Historia 2 ukończona; zalogowany jako zwykły członek.
> 
> **Uprawnienia**: Zwykły członek nie może tworzyć zadań dla innych członków.

1. **Zaloguj się jako zwykły członek**
   - Logowanie jako użytkownik bez roli koordynatora.
2. **Otwórz Kanban**
   - Przejdź do kanban projektu.
3. **Próba utworzenia zadania dla innego członka**
   - Kliknij **Nowe zadanie**.
   - Wypełnij formularz:
     - Tytuł: `Zadanie testowe`
     - Projekt: Dostępny projekt
   - W sekcji "Przydzielone do" spróbuj wybrać innego członka.
   - Pole "Przydzielone do" powinno być ograniczone - możliwość wyboru tylko siebie lub być automatycznie ustawione na bieżącego użytkownika.
4. **Potwierdzenie ograniczeń**
   - Jeśli pole pozwala na wybór, lista powinna zawierać tylko bieżącego użytkownika.
   - Jeśli ktokolwiek spróbuje zmienić przydzielenie poprzez API, powinien otrzymać błąd 403.
5. **Zbierz dowody**
   - Zrób zrzut ekranu formularza z ograniczoną listą przydzielenia.

---

## Historia 4 – Edycja zadania przez przydzielonego użytkownika

> Warunek wstępny: Historia 1 ukończona; istnieje zadanie przydzielone do bieżącego użytkownika.
> 
> **Uprawnienia**: Każdy użytkownik może edytować swoje własne zadania.

1. **Otwórz Kanban**
   - Przejdź do kanban projektu.
2. **Otwórz szczegóły zadania**
   - Kliknij na karcie zadania przydzielonego do Ciebie (np. **Implementacja logowania**).
   - Potwierdź, że otworzy się panel lub modal szczegółów.
3. **Edytuj zadanie**
   - Kliknij **Edytuj** lub ikonę ołówka.
   - Zmień następujące pola:
     - Opis: `Implementacja logowania - wersja 2 z dodatkowymi szczegółami`
     - Deadline: zmień na `2025-02-05`
4. **Zapisz zmiany**
   - Kliknij **Zapisz** / **Aktualizuj**.
   - Potwierdź powiadomienie o aktualizacji.
5. **Zweryfikuj zmiany w kanban**
   - Powrót do widoku kanban.
   - Karta zadania powinna pokazywać zaktualizowane informacje.
   - Kliknij ponownie, aby potwierdzić wszystkie zmiany zostały zapisane.
6. **Zbierz dowody**
   - Zrób zrzut ekranu kanban po zmianach.

---

## Historia 5 – Edycja zadania członka przez koordynatora

> Warunek wstępny: Historia 2 ukończona; zalogowany jako koordynator; istnieje zadanie przydzielone do członka.
> 
> **Uprawnienia**: Koordynator może edytować zadania członków w swoim projekcie.

1. **Zaloguj się jako koordynator**
   - Upewnij się, że jesteś koordynatorem projektu **Alpha Launch**.
2. **Otwórz Kanban**
   - Przejdź do kanban projektu.
3. **Otwórz zadanie przydzielone do członka**
   - Kliknij na kartę zadania przydzielonego do członka (np. **Testy jednostkowe dla modułu auth**).
4. **Edytuj zadanie**
   - Kliknij **Edytuj**.
   - Zmień:
     - Opis: dodaj notatki/opisy dla członka
     - Status: zmień na **W trakcie** (jeśli możliwe w edycji)
5. **Zapisz zmiany**
   - Kliknij **Zapisz**.
   - Potwierdź aktualizację.
6. **Powiadomienie dla członka**
   - Zaloguj się jako przydzielony członek.
   - Powinien widzieć zaktualizowane zadanie.
   - Opcjonalnie powinien otrzymać powiadomienie o zmianach.
7. **Zbierz dowody**
   - Zrób zrzuty ekranu z perspektywy koordynatora i członka.

---

## Historia 6 – Członek próbuje edytować zadanie innego członka

> Warunek wstępny: Historia 5 ukończona; zalogowany jako zwykły członek.
> 
> **Uprawnienia**: Zwykły członek nie może edytować zadań innych członków.

1. **Zaloguj się jako członek A**
   - Zalogowanie jako zwykły członek bez roli koordynatora.
2. **Otwórz Kanban**
   - Przejdź do kanban projektu.
3. **Spróbuj otworzyć zadanie przydzielone do innego członka**
   - Kliknij na kartę zadania przydzielonego do członka B (np. **Testy jednostkowe**).
4. **Sprawdzenie uprawnień**
   - Panel szczegółów powinien się otworzyć w trybie "tylko do odczytu".
   - Przycisk **Edytuj** powinien być ukryty lub wyłączony.
   - Jeśli spróbujesz edytować poprzez URL lub API, powinien pojawić się błąd 403.
5. **Zbierz dowody**
   - Zrób zrzut ekranu panelu szczegółów bez przycisku edycji.

---

## Historia 7 – Usuwanie zadania

> Warunek wstępny: Historia 1 i 4 ukończone; istnieje zadanie do usunięcia.
> 
> **Uprawnienia**: 
> - Użytkownik może usunąć swoje własne zadanie.
> - Koordynator może usunąć zadania członków w swoim projekcie.
> - Administrator może usunąć każde zadanie.

1. **Otwórz Kanban**
   - Przejdź do kanban projektu.
2. **Otwórz szczegóły zadania do usunięcia**
   - Kliknij na karcie zadania przydzielonego do Ciebie.
3. **Usuń zadanie**
   - Kliknij przycisk **Usuń** (może być w menu kontekstowym lub w panelu szczegółów).
   - Potwierdź usunięcie w oknie dialogowym.
4. **Potwierdzenie usunięcia**
   - Powiadomienie (toast) potwierdza, że zadanie zostało usunięte.
5. **Zweryfikuj brak w kanban**
   - Powrót do widoku kanban.
   - Zadanie nie powinno być już widoczne.
6. **Zbierz dowody**
   - Zrób zrzut ekranu kanban bez usuniętego zadania.

---

## Historia 8 – Przenoszenie zadania między kolumnami

> Warunek wstępny: Historia 1 ukończona; istnieje co najmniej jedno zadanie.

1. **Otwórz Kanban**
   - Przejdź do kanban projektu.
   - Potwierdź, że widoczne są kolumny: **Backlog**, **Do zrobienia**, **W trakcie**, **Zrobione**.
2. **Przenieś zadanie ze statusem drag-and-drop**
   - Kliknij i przytrzymaj kartę zadania (np. **Implementacja logowania** w **Backlog**).
   - Przeciągnij do kolumny **Do zrobienia**.
   - Upuść kartę.
3. **Potwierdzenie zmiany statusu**
   - Zadanie powinno pojawić się w kolumnie **Do zrobienia**.
   - Status powinien być automatycznie zaktualizowany w bazie danych.
4. **Kontynuuj przenoszenie**
   - Przenieś zadanie z **Do zrobienia** do **W trakcie**.
   - Przenieś z **W trakcie** do **Zrobione**.
5. **Weryfikacja zmian**
   - Otwórz szczegóły zadania.
   - Pole "Status" powinno odzwierciedlać kolumnę, w której znajduje się zadanie.
6. **Zbierz dowody**
   - Zrób zrzuty ekranu kanban na każdym etapie przenoszenia.

---

## Historia 9 – Sortowanie zadań po użytkowniku

> Warunek wstępny: Historia 1-2 ukończone; istnieje wiele zadań przydzielonych do różnych użytkowników.

1. **Otwórz Kanban**
   - Przejdź do kanban projektu.
   - Potwierdź, że widoczne są zadania przydzielone do różnych użytkowników.
2. **Poszukaj opcji filtrowania/sortowania**
   - W kanban poszukaj sekcji **Filtry** lub panelu bocznego.
   - Powinny być dostępne opcje filtrowania po użytkownikach/przydzieleniach.
3. **Zfiltruj zadania po jednym użytkowniku**
   - Zaznacz tylko jednego użytkownika (np. **John Doe**).
   - Kanban powinien pokazywać tylko zadania przydzielone do tego użytkownika.
   - Wszystkie kolumny powinny być widoczne, ale tylko z zadaniami tego użytkownika.
4. **Zfiltruj wiele użytkowników**
   - Zaznacz kilku użytkowników (np. **John Doe** i **Jane Smith**).
   - Kanban pokazuje zadania przydzielone do obu użytkowników.
5. **Pokaż wszystkie zadania**
   - Zaznacz opcję "Wszyscy użytkownicy" lub wyczyść filtry.
   - Kanban powinien pokazywać zadania przydzielone do wszystkich na kanban.
6. **Zfiltruj zadania przydzielone do Ciebie**
   - Zaznacz opcję "Przydzielone do mnie".
   - Powinny być widoczne tylko Twoje zadania.
7. **Zbierz dowody**
   - Zrób zrzuty ekranu z różnymi konfiguracjami filtrów.

---

## Historia 10 – Sortowanie i zmiana kolejności zadań w kolumnie

> Warunek wstępny: Historia 1 i 8 ukończone; istnieje wiele zadań w jednej kolumnie.

1. **Otwórz Kanban**
   - Przejdź do kanban projektu.
   - Upewnij się, że co najmniej jedna kolumna ma co najmniej 3 zadania.
2. **Zmień kolejność zadań poprzez drag-and-drop**
   - W kolumnie (np. **Do zrobienia**) kliknij i przytrzymaj kartę pierwszego zadania.
   - Przeciągnij wyżej lub niżej w stosunku do innych zadań.
   - Upuść kartę na nowej pozycji.
3. **Potwierdzenie zmiany kolejności**
   - Zadanie powinno pozostać w tej samej kolumnie.
   - Kolejność powinna być zmieniona.
   - Zmiana powinna być trwała (zapisana w bazie danych).
4. **Weryfikacja kolejności**
   - Odśwież stronę.
   - Zadania powinny pozostać w nowej kolejności.
5. **Zbierz dowody**
   - Zrób zrzuty ekranu przed i po zmianie kolejności.

---

## Historia 11 – Dodawanie etykiet/tagów do zadania

> Warunek wstępny: Historia 1 i 4 ukończone; istnieje zadanie do edycji.

1. **Otwórz szczegóły zadania**
   - Kliknij na kartę zadania w kanban.
2. **Edytuj zadanie**
   - Kliknij **Edytuj**.
3. **Dodaj etykiety**
   - W sekcji "Etykiety" / "Tagi" kliknij **Dodaj etykietę**.
   - Zaznacz istniejące etykiety (np. `frontend`, `urgent`, `design`) lub utwórz nowe.
4. **Zapisz zmiany**
   - Kliknij **Zapisz**.
5. **Weryfikacja w kanban**
   - Karta zadania powinna wyświetlać etykiety jako kolorowe znaczniki/tagi.
6. **Filtrowanie po etykietach**
   - Jeśli dostępne, skorzystaj z filtru etykiet.
   - Zaznacz etykietę `frontend`.
   - Kanban pokazuje tylko zadania z tą etykietą.
7. **Zbierz dowody**
   - Zrób zrzut ekranu karty z etykietami.

---

## Historia 12 – Wyświetlanie informacji dodatkowych na karcie zadania

> Warunek wstępny: Historia 1-11 ukończone.

1. **Otwórz Kanban**
   - Przejdź do kanban projektu.
2. **Sprawdzenie informacji na karcie zadania**
   - Każda karta powinna wyświetlać:
     - **ID zadania** (identyfikator/numer)
     - **Opis** (główna treść zadania)
     - **Przydzielony do** (avatar/inicjały użytkownika)
     - **Data utworzenia** (data dodania zadania)
     - **Deadline** (data, jeśli jest zbliżająca się, może być zaznaczona na czerwono)
3. **Hover na kartę (opcjonalnie)**
   - Przesunięcie myszy nad kartę powinna pokazać:
     - Pełny opis
     - Data utworzenia
     - Data deadline
4. **Kliknięcie na kartę**
   - Otwarcie pełnych szczegółów w panelu bocznym.
5. **Zbierz dowody**
   - Zrób zrzut ekranu karty z wszystkimi wymaganymi informacjami.

---

## Historia 13 – Systemy powiadomień o zmianach zadania

> Warunek wstępny: Historia 2 i 5 ukończone; użytkownik ma skonfigurowane powiadomienia.

1. **Konfiguracja powiadomień**
   - Zaloguj się jako członek.
   - Przejdź do ustawień powiadomień.
   - Upewnij się, że powiadomienia dla zmian zadań są włączone.
2. **Koordynator tworzy zadanie dla członka**
   - Zaloguj się jako koordynator.
   - Utwórz nowe zadanie przydzielone do członka.
3. **Sprawdzenie powiadomienia w aplikacji**
   - Zaloguj się jako przydzielony członek.
   - Powinno pojawić się powiadomienie (badge, bell icon, toast) o nowym zadaniu.
4. **Koordynator edytuje zadanie**
   - Zaloguj się jako koordynator.
   - Edytuj zadanie (zmień priorytet, deadline itp.).
5. **Sprawdzenie powiadomienia o zmianie**
   - Zaloguj się jako członek.
   - Powinno pojawić się powiadomienie o zmianach w zadaniu.
6. **Email powiadomienia (opcjonalnie)**
   - Jeśli system wspiera email, sprawdź pocztę skonfigurowanej osoby.
   - Powinny przyjść e-maile o nowych zadaniach i zmianach.
7. **Zbierz dowody**
   - Zrób zrzuty ekranu powiadomień w aplikacji.
   - Zanotuj otrzymane powiadomienia email (czas, treść).

---

## Historia 14 – Widok kanban z wielu projektów

> Warunek wstępny: Historia 1-2 ukończone; użytkownik ma dostęp do wielu projektów.

1. **Otwórz Kanban**
   - Z głównej nawigacji wybierz **Kanban** (jeśli dostępny widok globalny).
   - Lub otwórz pulpit nawigacyjny i sprawdzić, czy dostępne są widoki kanban dla różnych projektów.
2. **Filtrowanie po projektach**
   - Jeśli dostępna jest opcja filtrowania, zaznacz określone projekty.
   - Kanban powinien pokazywać zadania z wybranych projektów.
3. **Widok wszystkich projektów**
   - Zaznacz wszystkie dostępne projekty.
   - Kanban pokazuje zadania ze wszystkich projektów.
   - Możliwość odróżnienia zadań po kolorze/etykiecie projektu.
4. **Przechodzenie między projektami**
   - Z kanban przejdź do konkretnego projektu.
   - Kanban filtruje się automatycznie do tego projektu.
5. **Zbierz dowody**
   - Zrób zrzuty ekranu kanban z różnymi filtrami projektów.

---

## Uwagi do wykonania

- Dla wykonania ręcznego zanotuj zrzuty ekranów w różnych stanach kanban.
- Zweryfikuj zachowanie drag-and-drop na wszystkich urządzeniach (desktop, tablet, mobile, jeśli wspierane).
- Przetestuj filtry dla różnych kombinacji użytkowników i projektów.
- Upewnij się, że zmiany statusu zadania są natychmiast widoczne i trwałe.
- Monitoruj powiadomienia i potwierdzaj ich dostawę na czas.
- Zarejestruj wszelkie błędy lub nieoczekiwane zachowania dla zespołu wsparcia.
- Sprawdź zachowanie na różnych przeglądarkach i urządzeniach.
