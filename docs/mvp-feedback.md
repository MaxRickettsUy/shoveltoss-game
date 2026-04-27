## replace shovel with asset image
- replace the current shovel with the image at asstes/shovel.png

## replace the pit with asset image
- replace the current pit with the image at assets/pit.png


## character selection
- replace the current landing / start page with a tiled character selector
- each tile should show the hero image for each character in assets/character
- selecting a character should use the corresponding characters sprite sheet
- use the same character until a user refreshes the page

## background image
- apply the image assets/house.png as the background for the game

---

## meter design
- the current meter doesn't seem right, there is a "sweet spot" that is usually too powerful, sending the shovel out of bounds

## shovel physics
- the shovel should slighly rotate as it flies across the screen
- one end should represent the handle and the other should represent the blade of the shovel
- if the shovel lands parallel to the wall, in the physical world this would be a "stick" and the blade would cut into the pit
- if the shovel is perpendicular to the wall, that means it's laying in the pit

## asset replacement
- replace basic square character with the first sprite

---

## ui design
- shorter wall
- remove the invisible wall above / beyond the wall; the shovel should be able to fly off of the screen

## difficulty system
- i don't like the faster meter after each throw being the main difficulty
- let's set a constant slightly fast and difficult meter speed

## integrate rules in game play and physics
- update gameplay to use actual rules of the game. focus on scoring for now.

here are the rules :
# Shoveltoss Rules

## How to Win

- First to 15 wins.
- 3 points awarded for a *shovel stick*.
- 2 points awarded for a shovel leaning against the back wall.
- 1 point awarded for the shovel lying fully in the garden.
- 0 points are awarded if the shovel is touching any part of the front wall.
- -2 points if the shovel lands completely outside of the garden.

## Gameplay

### Determine The Order

A game of rock-paper-scissors is held. The winner selects if they would like to go first or second.

### Inning

Each person receives a toss in an inning in the order the match begins until one of the players reach 15. The inning is still completed if the first person to toss reaches 15 (exactly). It is important to announce the score after every inning.

### Going Over

If a player goes over 15 points the number of points they exceeded 15 by gets subtracted from 15 and becomes their point total. (Ex. Player hits 17, 2 over 15, so 15-2 = 13. Their score is now 13).

### Redemption

If at the end of an inning, one contestant hits 15 points (exactly) the other player gets a redemption shot. If they stick the shovel in the garden, they receive an additional throw until they reach 15 points (exactly) or fail to stick the shovel in the garden.

### Overtime

Occurs if both players hit exactly 15 either during regulation or with redemption.

#### Determine the Order

The first player who hit 15 gets to choose if they would like to go first or second.

#### Play

Players receive three alternating throws. The highest score after those three throws wins. If there is a tie the OT goes into sudden death.

#### Sudden Death

Each player throws a shovel to stick. The first player to stick their shovel in the garden without the other player completing a stick wins.

---

## ui design
- move score and throw count together to the left side of the screen
- the pit wall height should only be half of the screen
- make the meter smaller, should not be full screen width

## inconsistent mobile user experience
- the game should have a similar experience on portrait and landscape mode
- the shovel arc is too "straight" in portrait mode

---

## ui design (prompts/plans/1-ui-wall-physics.md)
- make meter horizontal, move it to the top of the screen
- the dirt pit should be location at the end of the screen
- there should be a wall behind the pit
- the shovel should be able to deflect off the pit wall into the pit for points

## difficulty system (prompts/plans/2-difficulty-system.md)
- stop reducing the dirt pit width each throw, instead difficulty should be reflected in the meter