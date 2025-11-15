# Scenariusze End-to-End zarządzania kalendarzem

Poniższe scenariusze opisują przepływy end-to-end obejmujące główne funkcje kalendarza organizacyjnego.

## Uprawnienia do tworzenia zdarzeń

- **Administrator**: Może tworzyć zdarzenia dla każdego projektu, międzyprojektowe i dla całej organizacji.
- **Koordynator**: Może tworzyć zdarzenia dla swojego projektu oraz międzyprojektowe.
- **Zwykły członek**: Może tworzyć zdarzenia tylko dla projektów, do których ma przypisane tagi.

---

## Historia 1 – Tworzenie wydarzenia dla pojedynczej grupy projektowej

> Warunek wstępny: Zalogowany jako administrator/koordynator z dostępem do kalendarza; istnieje co najmniej jedna grupa projektowa.
> 
> **Uprawnienia**: Administrator i koordynator mogą zawsze tworzyć dla swoich projektów. Zwykły członek może tworzyć tylko dla projektów, do których ma tagi.

1. **Otwórz moduł kalendarza**
   - Z głównej nawigacji wybierz **Kalendarz**.
   - Potwierdź, że widok domyślny to bieżący miesiąc/tydzień.
2. **Utwórz nowe wydarzenie**
   - Kliknij przycisk **Nowe wydarzenie** lub dwukrotnie kliknij na konkretny dzień/godzinę.
   - Wypełnij formularz:
     - Tytuł: `Standup zespołu`
     - Opis: `Codzienny standup scrum`
     - Data początkowa: `2025-01-20`
     - Godzina początkowa: `10:00`
     - Data końcowa: `2025-01-20`
     - Godzina końcowa: `10:30`
     - Przydziel do grupy: Wybierz **Alpha Launch**
   - Zaznacz opcję **Powtarzaj codziennie** (opcjonalnie).
3. **Zapisz wydarzenie**
   - Kliknij **Zapisz** / **Utwórz**.
   - Zweryfikuj powiadomienie (toast) o pomyślnym utworzeniu.
4. **Potwierdź widoczność w kalendarzu**
   - Wydarzenie powinno pojawić się w wybranym dniu o podanej godzinie.
   - Kolor bloku wydarzenia powinien odpowiadać grupie projektowej.
5. **Zbierz dowody**
   - Zrób zrzut ekranu kalendarza z nowym wydarzeniem.

---

## Historia 2 – Tworzenie wydarzenia dla wielu grup projektowych (logika AND/OR)

> Warunek wstępny: Historia 1 ukończona; istnieje co najmniej 2 grupy projektowe.
> 
> **Uprawnienia**: Tylko administrator może tworzyć zdarzenia dla wielu projektów jednocześnie. Koordynator może tworzyć tylko dla swojego projektu lub międzyprojektowe (jeśli zdefiniowane). Zwykły członek nie ma dostępu do tworzenia dla wielu projektów.

1. **Zaloguj się jako administrator**
   - Upewnij się, że posiadasz uprawnienia administracyjne.
2. **Otwórz formularz tworzenia wydarzenia**
   - W kalendarzu kliknij **Nowe wydarzenie**.
3. **Utwórz wydarzenie dla wielu grup (AND)**
   - Wypełnij formularz:
     - Tytuł: `Spotkanie koordynacyjne`
     - Opis: `Koordynacja między zespołami Alpha i Beta`
     - Data i godzina: `2025-01-21, 14:00 - 15:00`
   - W sekcji "Grupy projektowe" wybierz **Alpha Launch** ORAZ **Beta Initiative**.
   - Opcjonalnie, jeśli dostępne, wybierz logikę **AND** (tylko uczestniczący w obu grupach widzą).
4. **Utwórz wydarzenie dla wielu grup (OR)**
   - Alternatywnie, jeśli obsługiwane: wybierz logikę **OR** (każdy z grupy widzi).
   - Zapisz i potwierdź.
5. **Sprawdź widoczność dla różnych użytkowników**
   - Zaloguj się jako członek grupy **Alpha Launch** → powinien widzieć wydarzenie.
   - Zaloguj się jako członek grupy **Beta Initiative** → powinien widzieć wydarzenie.
   - Zaloguj się jako członek innej grupy → nie powinien widzieć (jeśli AND) lub widzieć (jeśli OR).
   - Zaloguj się jako zwykły członek bez dostępu do tych grup → nie powinien widzieć.
6. **Zbierz dowody**
   - Zrób zrzuty ekranu widoku dla każdej roli.

---

## Historia 3 – Tworzenie wydarzenia otwartego (dostępnego dla całej organizacji)

> Warunek wstępny: Historia 1 i 2 ukończone.
> 
> **Uprawnienia**: Tylko administrator może tworzyć zdarzenia otwarte dla całej organizacji. Koordynator i zwykły członek nie mogą tworzyć zdarzeń dla całej organizacji.

1. **Zaloguj się jako administrator**
   - Upewnij się, że posiadasz uprawnienia administracyjne.
2. **Otwórz formularz tworzenia wydarzenia**
   - W kalendarzu kliknij **Nowe wydarzenie**.
3. **Utwórz wydarzenie otwarte**
   - Wypełnij formularz:
     - Tytuł: `Konferencja firmy roczna`
     - Opis: `Doroczne spotkanie wszystkich pracowników`
     - Data i godzina: `2025-02-10, 09:00 - 17:00`
   - W sekcji "Dostęp" / "Widoczność" wybierz opcję **Otwarte dla całej organizacji** lub **Brak ograniczeń grupy**.
4. **Zapisz wydarzenie**
   - Kliknij **Zapisz**.
   - Potwierdź powiadomienie o sukcesie.
5. **Zweryfikuj dostęp**
   - Zaloguj się jako dowolny członek organizacji (administrator, koordynator, zwykły członek).
   - Powinien widzieć to wydarzenie w kalendarzu niezależnie od grupy.
6. **Próba utworzenia zdarzenia otwartego jako koordynator**
   - Zaloguj się jako koordynator.
   - Spróbuj utworzyć nowe wydarzenie.
   - Sekcja "Otwarte dla całej organizacji" powinna być niedostępna lub ukryta.
   - Potwierdzenie, że koordynator nie może tworzyć zdarzeń dla całej organizacji.
7. **Zbierz dowody**
   - Zrób zrzut ekranu ze zlogowanego administratora tworzącego zdarzenie otwarte.
   - Zrób zrzut ekranu formularza koordynatora bez opcji "otwarte".

---

## Historia 4 – Modyfikacja istniejącego wydarzenia

> Warunek wstępny: Historia 1 ukończona; istnieje co najmniej jedno wydarzenie.
> 
> **Uprawnienia**: Administrator może edytować każde zdarzenie. Koordynator może edytować zdarzenia ze swojego projektu i międzyprojektowe. Zwykły członek może edytować tylko zdarzenia ze swoich projektów.

1. **Otwórz szczegóły wydarzenia**
   - W widoku kalendarza kliknij na istniejące wydarzenie (np. **Standup zespołu**).
   - Potwierdź, że otworzy się panel lub modal szczegółów.
2. **Edytuj wydarzenie**
   - Kliknij przycisk **Edytuj** lub ikonę ołówka.
   - Zmień następujące pola:
     - Tytuł: `Standup zespołu (zmiana czasu)`
     - Godzina początkowa: zmień z `10:00` na `09:30`
     - Opis: `Codzienny standup scrum - przesunięty wcześniej`
3. **Zapisz zmiany**
   - Kliknij **Zapisz** / **Aktualizuj**.
   - Potwierdź powiadomienie o aktualizacji.
4. **Zweryfikuj zmiany w kalendarzu**
   - Powrót do widoku kalendarza.
   - Wydarzenie powinno pojawić się o nowej godzinie (`09:30`).
   - Kliknij ponownie, aby potwierdzić, że wszystkie zmiany zostały zapisane.
5. **Zbierz dowody**
   - Zrób zrzut ekranu kalendarza oraz panelu szczegółów po edycji.

---

## Historia 5 – Usuwanie wydarzenia

> Warunek wstępny: Historia 4 ukończona; istnieje co najmniej jedno wydarzenie do usunięcia.
> 
> **Uprawnienia**: Administrator może usunąć każde zdarzenie. Koordynator może usunąć zdarzenia ze swojego projektu i międzyprojektowe. Zwykły członek może usunąć tylko zdarzenia ze swoich projektów.

1. **Otwórz szczegóły wydarzenia**
   - Kliknij na dowolne wydarzenie w kalendarzu.
2. **Usuń wydarzenie**
   - Kliknij przycisk **Usuń** (może być w menu kontekstowym lub w panelu szczegółów).
   - Potwierdź usunięcie w oknie dialogowym.
3. **Potwierdzenie usunięcia**
   - Powiadomienie (toast) potwierdza, że wydarzenie zostało usunięte.
4. **Zweryfikuj brak w kalendarzu**
   - Powrót do widoku kalendarza.
   - Wydarzenie nie powinno być już widoczne w danym dniu.
5. **Zbierz dowody**
   - Zrób zrzut ekranu kalendarza bez usuniętego wydarzenia.

---

## Historia 6 – Widok tygodniowy kalendarza

> Warunek wstępny: Historia 1-3 ukończone; istnieje co najmniej kilka wydarzeń w bieżącym tygodniu.

1. **Przełącz na widok tygodniowy**
   - W kalendarzu kliknij przycisk/tab **Tydzień** (lub podobny opcja widoku).
   - Potwierdź, że widok pokazuje aktualny tydzień (poniedziałek-niedziela lub zgodnie z konfiguracją).
2. **Weryfikuj godziną linii**
   - Lewa kolumna powinna wyświetlać godziny (np. 8:00, 9:00, 10:00, itd.).
   - Każdy dzień powinien być wyświetlany w kolumnie.
3. **Sprawdź rozmieszczenie zdarzeń**
   - Wszystkie wydarzenia powinny pojawić się w odpowiednich dniach i godzinach.
   - Wydarzenia, które trwają dłużej niż 1 godzinę, powinny zajmować proporcjonalnie większy obszar.
4. **Nawigacja w tygodniach**
   - Kliknij strzałkę **Następny tydzień** / przycisk nawigacji.
   - Potwierdź, że widok przechodzi do następnego tygodnia.
   - Kliknij strzałkę **Poprzedni tydzień**.
5. **Zbierz dowody**
   - Zrób zrzuty ekranu widoku tygodniowego z kilkoma miesiącami.

---

## Historia 7 – Widok miesięczny kalendarza

> Warunek wstępny: Historia 1-5 ukończone.

1. **Przełącz na widok miesięczny**
   - W kalendarzu kliknij przycisk/tab **Miesiąc** (lub domyślny widok).
   - Potwierdź, że widok pokazuje cały miesiąc w formacie siatki (7 kolumn na dni tygodnia).
2. **Weryfikuj strukturę kalendarza**
   - Każda komórka powinna reprezentować jeden dzień.
   - Dni z poprzedniego/następnego miesiąca powinny być wygaszone lub ukryte.
   - Nazwy dni tygodnia powinny być widoczne u góry.
3. **Sprawdź wyświetlanie zdarzeń**
   - Zdarzenia powinny być wyświetlane jako kompaktowe wpisy (np. `[10:00] Standup zespołu`).
   - Wiele zdarzeń w jednym dniu powinno być wykazane z opcją **Pokaż więcej** lub zwijane.
4. **Nawigacja w miesiącach**
   - Kliknij strzałkę **Następny miesiąc**.
   - Potwierdź przechodzenie do następnego miesiąca.
   - Kliknij na konkretny dzień → powinna się otworzyć opcja tworzenia nowego wydarzenia dla tego dnia.
5. **Zbierz dowody**
   - Zrób zrzuty ekranu widoku miesięcznego w różnych miesiącach.

---

## Historia 8 – Opcja pełnego ekranu / maksymalizacji kalendarza

> Warunek wstępny: Historia 6-7 ukończone.

1. **Otwórz kalendarz**
   - Przejdź do widoku kalendarza w domyślnym układzie (dashboard).
2. **Aktywuj tryb pełnego ekranu**
   - Poszukaj ikony pełnego ekranu (zwykle w prawym górnym rogu panelu kalendarza).
   - Kliknij ikonę, aby powiększyć kalendarz na cały ekran.
   - Potwierdź, że kalendarz zajmuje teraz całą dostępną przestrzeń przeglądarki.
3. **Zweryfikuj funkcjonalność w pełnym ekranie**
   - Widok tygodniowy/miesięczny powinien być łatwo dostępny.
   - Przełączanie widoków powinno działać prawidłowo.
   - Tworzenie/edycja zdarzeń powinno funkcjonować normalnie.
4. **Zamknij tryb pełnego ekranu**
   - Kliknij ikonę pełnego ekranu ponownie lub naciśnij **Esc**.
   - Powrót do normalnego widoku dashboarda.
5. **Zbierz dowody**
   - Zrób zrzuty ekranu w trybie pełnego ekranu i w normalnym widoku.

---

## Historia 9 – Wiele zdarzeń w tym samym momencie (nakładanie się)

> Warunek wstępny: Historia 1-6 ukończone.

1. **Utwórz wiele nakładających się zdarzeń**
   - Utwórz pierwsze wydarzenie:
     - Tytuł: `Spotkanie zespołu A`
     - Czas: `2025-01-22, 14:00 - 15:00`
     - Grupa: **Alpha Launch**
   - Utwórz drugie wydarzenie w tym samym czasem:
     - Tytuł: `Spotkanie zespołu B`
     - Czas: `2025-01-22, 14:00 - 15:00`
     - Grupa: **Beta Initiative**
   - Utwórz trzecie, które częściowo się nakłada:
     - Tytuł: `Spotkanie menadżerów`
     - Czas: `2025-01-22, 14:30 - 15:30`
     - Grupa: Otwarte
2. **Przełącz na widok tygodniowy**
   - Sprawdzić sposób wyświetlania nakładających się zdarzeń.
   - Powinny być wyświetlane obok siebie (kolumny) lub w kompaktowym formacie.
3. **Przełącz na widok miesięczny**
   - W widoku miesięcznym, w dniu `2025-01-22` powinno być co najmniej 3 zdarzenia.
   - Jeśli wszystkie się nie mieszczą, powinna być opcja **Pokaż więcej [+3]** lub podobna.
4. **Kliknij na opcję "Pokaż więcej"**
   - Powinna się otworzyć lista lub panel pokazujący wszystkie zdarzenia na ten dzień.
   - Powinny być wyświetlane wszystkie 3 zdarzenia z godzinami.
5. **Zbierz dowody**
   - Zrób zrzuty ekranu w widoku tygodniowym i miesięcznym z nakładającymi się zdarzeniami.
   - Zrób zrzut ekranu panelu "Pokaż więcej".

---

## Historia 10 – Filtrowanie zdarzeń po grupach projektowych

> Warunek wstępny: Historia 1-3 ukończone; istnieje wiele zdarzeń dla różnych grup.

1. **Otwórz opcje filtrowania**
   - W kalendarzu poszukaj sekcji **Filtry** lub panelu bocznego.
   - Powinny być dostępne pola wyboru dla każdej grupy projektowej oraz opcji "Otwarte".
2. **Zfiltruj tylko jedną grupę**
   - Odznacz wszystkie grupy oprócz **Alpha Launch**.
   - Potwierdź, że w kalendarzu pokazują się tylko zdarzenia z tej grupy.
   - Zdarzenia otwarte mogą być widoczne (zależy od implementacji).
3. **Filtruj wiele grup**
   - Zaznacz **Alpha Launch** i **Beta Initiative**.
   - Zdarzenia z obu grup powinny być widoczne.
4. **Zfiltruj tylko zdarzenia otwarte**
   - Odznacz wszystkie grupy, zaznacz tylko **Zdarzenia otwarte**.
   - Powinny być widoczne tylko zdarzenia dostępne dla całej organizacji.
5. **Wyczyść filtry**
   - Kliknij przycisk **Wyczyść filtry** lub zaznacz wszystkie opcje.
   - Wszystkie zdarzenia powinny być znowu widoczne.
6. **Zbierz dowody**
   - Zrób zrzuty ekranu z różnymi konfiguracjami filtrów.

---

## Historia 11 – Zdarzenia cykliczne (powtarzające się)

> Warunek wstępny: Historia 1 i 4 ukończone.

1. **Utwórz zdarzenie cykliczne**
   - Otwórz formularz tworzenia nowego wydarzenia.
   - Wypełnij formularz:
     - Tytuł: `Cotygodniowy Review`
     - Data początkowa: `2025-01-20`
     - Godzina: `16:00 - 17:00`
     - Grupa: **Alpha Launch**
   - W sekcji **Powtarzanie** wybierz opcję **Cotygodniowo** (co poniedziałek).
   - Ustaw datę końcową: `2025-03-31` (lub "bez końca").
2. **Zapisz zdarzenie**
   - Kliknij **Zapisz**.
   - Potwierdź wiadomość o pomyślnym utworzeniu zdarzenia cyklicznego.
3. **Zweryfikuj powtórzenia w kalendarzu**
   - Przejdź do widoku miesięcznego na styczeń/luty 2025.
   - Powinny być widoczne zdarzenia "Cotygodniowy Review" co poniedziałek.
4. **Edytuj jedno wystąpienie**
   - Kliknij na jedno z powtórzeń (np. 2025-01-27).
   - Wybierz opcję **Edytuj to zdarzenie** (nie cały cykl).
   - Zmień godzinę: `17:00 - 18:00`.
   - Zapisz.
5. **Edytuj cały cykl**
   - Kliknij na inne powtórzenie.
   - Wybierz **Edytuj cały cykl**.
   - Zmień tytuł na `Cotygodniowy Review (zaktualizowany)`.
   - Zapisz.
   - Wszystkie powtórzenia powinny mieć nowy tytuł.
6. **Zbierz dowody**
   - Zrób zrzuty ekranu pokazujące powtórzenia w kalendarzu.
   - Zrób zrzut ekranu edycji pojedynczego i całego cyklu.

---

## Historia 12 – Powiadomienia i przypomnienia dla zdarzeń

> Warunek wstępny: Historia 1 i 11 ukończone; użytkownik ma skonfigurowane preferencje powiadomień.

1. **Utwórz zdarzenie z przypomnieniami**
   - Otwórz formularz tworzenia nowego wydarzenia.
   - Wypełnij podstawowe dane:
     - Tytuł: `Ważne spotkanie klienta`
     - Data i godzina: `2025-01-25, 10:00 - 11:00`
   - W sekcji **Powiadomienia/Przypomnienia** dodaj:
     - Przypomnienie 1: `15 minut przed` (powiadomienie e-mail)
     - Przypomnienie 2: `1 godzina przed` (powiadomienie w aplikacji)
2. **Zapisz zdarzenie**
   - Kliknij **Zapisz**.
3. **Weryfikacja powiadomień**
   - 1 godzinę przed zdarzeniem, użytkownik powinien otrzymać powiadomienie w aplikacji.
   - 15 minut przed zdarzeniem, powinno przyjść powiadomienie e-mail.
4. **Zmień ustawienia przypomnienia**
   - Otwórz szczegóły zdarzenia.
   - Kliknij **Edytuj**.
   - Zmień przypomnienie z `15 minut` na `30 minut` przed.
   - Zapisz.
5. **Zbierz dowody**
   - Zrób zrzut ekranu formularza z ustalonymi powiadomieniami.
   - Zanotuj czasy otrzymania powiadomień (jeśli system jest aktywny).

---

## Historia 13 – Testowanie uprawnień do tworzenia zdarzeń

> Warunek wstępny: Historia 1-6 ukończone; istnieją co najmniej 2 grupy projektowe z członkami o różnych rolach.

1. **Przygotowanie testów uprawnień**
   - Upewnij się, że masz dostęp do:
     - Konta administratora
     - Konta koordynatora przypisanego do projektu **Alpha Launch**
     - Konta członka przypisanego do projektu **Alpha Launch**
     - Konta członka bez dostępu do projektów

2. **Test: Administrator tworzy zdarzenie dla każdego projektu**
   - Zaloguj się jako administrator.
   - Spróbuj tworzyć zdarzenia dla:
     - Projektu **Alpha Launch** ✓ powinno być możliwe
     - Projektu **Beta Initiative** ✓ powinno być możliwe
     - Zdarzenia międzyprojektowego (dla obu projektów) ✓ powinno być możliwe
     - Zdarzenia dla całej organizacji ✓ powinno być możliwe
   - Wszystkie opcje powinny być dostępne w formularzu.

3. **Test: Koordynator projektu Alpha tworzy zdarzenia**
   - Zaloguj się jako koordynator przypisany do **Alpha Launch**.
   - Próbuj tworzyć zdarzenia:
     - Dla projektu **Alpha Launch** ✓ powinno być możliwe
     - Dla projektu **Beta Initiative** ✗ powinno być niemożliwe (opcja niedostępna)
     - Zdarzenia międzyprojektowego ✓ powinno być możliwe (jeśli zdefiniowane)
     - Zdarzenia dla całej organizacji ✗ powinno być niemożliwe (opcja niedostępna)
   - Formularz powinien pokazywać tylko dozwolone projekty.

4. **Test: Zwykły członek Alpha tworzy zdarzenia**
   - Zaloguj się jako zwykły członek przypisany do **Alpha Launch**.
   - Próbuj tworzyć zdarzenia:
     - Dla projektu **Alpha Launch** ✓ powinno być możliwe
     - Dla projektu **Beta Initiative** ✗ powinno być niemożliwe (opcja niedostępna)
     - Zdarzenia międzyprojektowego ✗ powinno być niemożliwe (niedostępne)
     - Zdarzenia dla całej organizacji ✗ powinno być niemożliwe (niedostępne)
   - Formularz powinien pokazywać wyłącznie **Alpha Launch**.

5. **Test: Członek bez projektów**
   - Zaloguj się jako członek bez przypisanych tagów/projektów.
   - Spróbuj otworzyć formularz tworzenia zdarzenia.
   - Powinno być wyświetlone ostrzeżenie lub komunikat o braku dostępu.
   - Przycisk **Utwórz** powinien być wyłączony.

6. **Test: Brak uprawnień do edycji lub usunięcia**
   - Zaloguj się jako członek Alpha.
   - Otwórz zdarzenie z projektu Beta (jeśli mogą je widzieć).
   - Przyciski **Edytuj** i **Usuń** powinny być ukryte lub wyłączone.
   - Jeśli spróbujesz edytować poprzez URL/API, powinien pojawić się błąd 403 (Forbidden).

7. **Zbierz dowody**
   - Zrób zrzuty ekranu formularzy dla każdej roli.
   - Zrób zrzuty ekranu błędów/ostrzeżeń o braku dostępu.
   - Zanotuj dostępne i niedostępne opcje dla każdej roli.

---

- Dla wykonania ręcznego zanotuj zrzuty ekranów w różnych widokach (tygodniowy, miesięczny, pełny ekran).
- Zweryfikuj zachowanie nakładających się zdarzeń na wszystkich urządzeniach (desktop, tablet).
- Przetestuj filtry dla różnych kombinacji grup projektowych.
- Upewnij się, że zdarzenia cykliczne działają prawidłowo przez kilka miesięcy.
- Monitoruj powiadomienia oraz potwierdzaj ich dostawę na czas.
- Zarejestruj wszelkie błędy lub nieoczekiwane zachowania dla zespołu wsparcia.
