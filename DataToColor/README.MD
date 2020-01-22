# DataToColor

This is a Lua WoW addon that extracts some game information and draws it on the game window as coloured rectangles. The data is encoded in the colours according to the type:

## Color encoding

### Spell status

Fills up an  with information about if we have a spell and if it is currently on cooldown or not.
These can have 3 different values:
 * `111` = Spell is OK to cast (The spell is not on cooldown and there is a spell in the slot)
 * `110` = The spell is NOT ok to cast (The spell is on cooldown and there is a spell in the slot)
 * `101` = There is not a spell in that slot

## Data slot reference

|   #       |Type           | Function                     |
|-----------|---------------|------------------------------|
|   0-1     |Float          | Player position X            |
|   2-3     |Float          | Player position Y            |
|   4-5     |Float          | Player direction             |
|     6     |Int            | Target                       |
|     7     |Int            | Potion status                |
|     8     |Int            | Combat status                |
|     9     |Bool (?)       | Is target dead               |
|    10     |Int            | Player health                |
|    11     |Int            | Player mana                  |
|    15     |Int            | Is within 35 yards to target |
|  16-175   |Item (2 cells) | Items from bags              |
|  176-207  |Item (2 cells) | Equipped items               |
|   208     |Spell status   | Fast spell 0                 |
|   209     |Spell status   | Fast spell 1                 |
|   210     |Spell status   | Fast spell 2                 |
|   211     |Spell status   | Fast spell 3                 |
|   218     |Spell status   | Fast spell 4                 |
| 212-221 (without 218)     |Spell status| Slow spell 0-8  |
| 222       |Int, fixed     | Size of main bag (always 16) |
| 223-227   |Int            | Bag (1-5) size               |
