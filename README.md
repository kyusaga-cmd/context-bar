# context-bar

Pasek nad polem promptu w aplikacji desktopowej Claude (zakładka Code), który pokazuje, jak bardzo zapełniony jest kontekst sesji, oraz dwa przyciski:

- **Nowa sesja z kontekstem** – Claude robi krótkie podsumowanie pracy i zakłada z nim nową sesję (mały kontekst = niższe zużycie).
- **Rozgałęź** – kopiuje całą rozmowę do nowej sesji, żeby spróbować innej drogi.

Kolory: zielony do 50%, pomarańczowy do 75%, czerwony powyżej.

## Instalacja

W aplikacji desktopowej Claude: kliknij **+** obok pola promptu → **Plugins** → **Add marketplace** i wpisz `kyusaga-cmd/context-bar`, potem **Add plugin** → **context-bar**.

W terminalu, w sesji Claude Code:

```
/plugin install context-bar --marketplace kyusaga-cmd/context-bar
```

Z powłoki:

```
claude plugin install context-bar --marketplace kyusaga-cmd/context-bar
```
