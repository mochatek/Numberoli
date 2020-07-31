let GAMEDATA = {
    name: null,
    reward: null,
    cash: null,
    room: null,
    enemy: null,
    flash: null
};


window.onload = setPlayerName;

//////////////////////////////////////////////////////////////////////////////////////////////////////

class Card extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, number) {
        super(scene, x, y, `card${number}`);
        this.number = number;
        this.setScale(0.75);
        scene.add.existing(this);
    }

    setActive(number) {
        this.number = number;
        this.setTexture(`card${number}`);
        this.setAlpha(1);
    }

    setInactive() {
        this.number = 0;
        this.setAlpha(0.25);
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

class Emote extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, emote) {
        super(scene, x, y, emote);
        this.emote = emote;
        this.setScale(0.625);
        this.setInteractive();
        this.on('pointerup', () => {
            scene.socket.emit('emote', this.emote);
            scene.playerEmote.anims.play(`${this.emote}Anim`, true);
            toggleEmotes(scene);
        })
        scene.add.existing(this);
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

class HomeScene extends Phaser.Scene {
    constructor() {
        super('homescene');
    }

    preload() {
        this.load.image('title', '../assets/numberoli.png');
        this.load.image('join', '../assets/join.png');
        this.load.image('create', '../assets/create.png');
        this.load.image('footer', '../assets/footer.png')
        this.load.image('wallet', '../assets/wallet.png')
    }

    create() {
        let self = this;

        let x = config.width / 2;
        let y = config.height / 2;

        this.add.image(x, 60, 'title');
        this.add.image(x - 35, y - 140, 'wallet');
        this.add.text(x + 5, y - 160, GAMEDATA.cash,
            {
                fontFamily: 'Changa',
                fontStyle: 'bold',
                fontSize: '40px',
                color: '#b9d370',
                stroke: '#00ff00',
                strokeThickness: 1,
            });

        this.add.text(x - 130, y + 100, 'INSTRUCTIONS',
            {
                fontFamily: 'Changa',
                fontStyle: 'bold',
                stroke: '#ff0000',
                strokeThickness: 5,
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#f26a74',
                fixedWidth: 260,
                align: 'center',
                padding: 5
            })
            .setInteractive()
            .on('pointerdown', () => {
                instruction.style.display = "block";
            });

        this.add.image(x, config.height - 40, 'footer');

        let roomName = `<input type="text" name="roomName" placeholder="Room Name"
                    style="width:256px; height: 32px; font-size: 20px; text-align: center;
                    color: white; background: #091c2b; border: 2px solid #059e9e">`;
        this.roomName = this.add.dom(x, y - 36).createFromHTML(roomName);

        if(GAMEDATA.flash) {
            this.add.text(x - 70, y - 6, GAMEDATA.flash,
                {
                    fontStyle: 'bold',
                    fontSize: '12px',
                    color: '#fff000'
                });
            GAMEDATA.flash = null;
        }

        this.createRoom = this.add.image(x - 72, y + 36, 'create').setInteractive();

        this.joinRoom = this.add.image(x + 72, y + 36, 'join').setInteractive();

        this.createRoom.on('pointerdown', () => {
            if(GAMEDATA.cash >= 12) {
                let roomName = self.roomName.getChildByName('roomName').value.trim();
                if(roomName) {
                    GAMEDATA.room = roomName;
                    self.scene.start('gamescene');
                }
            } else {
                window.alert('Not enough money in wallet. [Minimum ₹.12 needed to create]')
            }
        });

        this.joinRoom.on('pointerdown', () => {
            if(GAMEDATA.cash >= 12) {
                let roomName = self.roomName.getChildByName('roomName').value.trim();
                if(roomName) {
                    GAMEDATA.room = roomName;
                    self.scene.start('gamescene');
                }
            } else {
                window.alert('Not enough money in wallet. [Minimum ₹.12 needed to join]')
            }
        });
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

class GameScene extends Phaser.Scene {
    constructor() {
        super('gamescene')
    }

    preload() {
        this.load.image('card0', '../assets/0.png');
        this.load.image('card1', '../assets/1.png');
        this.load.image('card2', '../assets/2.png');
        this.load.image('card3', '../assets/3.png');
        this.load.image('card4', '../assets/4.png');
        this.load.image('card5', '../assets/5.png');
        this.load.image('card6', '../assets/6.png');
        this.load.image('card7', '../assets/7.png');
        this.load.image('card8', '../assets/8.png');
        this.load.image('card9', '../assets/9.png');
        this.load.image('card10', '../assets/10.png');
        this.load.image('card11', '../assets/11.png');
        this.load.image('card12', '../assets/12.png');
        this.load.image('card13', '../assets/unknown.png');
        this.load.image('rack', '../assets/rack.png');
        this.load.image('rackA', '../assets/rackActive.png');
        this.load.image('slotPanel', '../assets/slotPanel.png');
        this.load.image('toggle', '../assets/toggle.png');
        this.load.image('chat', '../assets/chat.png');

        this.load.audio('cardPlace', '../assets/cardPlace.wav');
        this.load.audio('endBell', '../assets/endBell.mp3');

        this.load.spritesheet('laugh', '../assets/laugh.png', {frameWidth: 64, frameHeight: 64});
        this.load.spritesheet('cry', '../assets/cry.png', {frameWidth: 64, frameHeight: 64});
        this.load.spritesheet('tease', '../assets/tease.png', {frameWidth: 64, frameHeight: 64});
        this.load.spritesheet('swear', '../assets/swear.png', {frameWidth: 64, frameHeight: 64});
        this.load.spritesheet('sleep', '../assets/sleep.png', {frameWidth: 64, frameHeight: 64});
    }

    create() {
        this.playerTurn = false;

        let self = this;

        this.opponentName = this.add.text((config.width - 340) / 2, 120, '▮ Waiting...',
            {
                fontFamily: 'Tahoma',
                color: '#87CEEB',
                fontSize: '12px'
            });
        this.playerDeck = this.add.group();
        this.opponentDeck = this.add.group();

        this.endBell = this.sound.add('endBell');
        this.cardPlace = this.sound.add('cardPlace');

        this.socket = io();

        this.socket.emit('join', {name: GAMEDATA.name, room: GAMEDATA.room});

        this.socket.on('disconnect', () => {
            GAMEDATA.flash = 'Oops!! Room is full.';
            this.scene.start('homescene');
        });

        showInterface(this);
        showSlots(this);
        showOpponentDeck(this);
        showPlayerDeck(this);

        this.input.setHitArea(this.playerDeck.getChildren()).on('gameobjectdown', (pointer, object) => {
            if(self.playerTurn && self.playerNums.includes(object.number)) {
                self.socket.emit('choice', object.number);
                self.playerTurn = false;
                self.playerRack.setTexture('rack');
            }
        });

        this.socket.on('emote', emote => {
            self.opponentEmote.anims.play(`${emote}Anim`, true);
        });

        this.socket.on('chat', msg => {
            self.opponentMsg.setText(msg).setAlpha(1);
            let tID = setTimeout(function() {
                self.opponentMsg.setAlpha(0);
                clearTimeout(tID);
            }, 1000);
        });


        this.socket.on('deck', data => {
            let {deck, enemy} =  data;
            self.playerNums = deck;
            self.opponentName.setText(`▮ ${enemy}`);
            GAMEDATA.enemy = enemy;
            updatePlayerDeck(self, self.playerNums);
            setUpEmoteNChat(self);
            self.socket.off('deck');
        });

        this.socket.on('end', cash => {
            GAMEDATA.reward = cash;
            GAMEDATA.cash += cash >= 0? cash + 12 : cash;
            localStorage.setItem('NPcash', GAMEDATA.cash);
            self.endBell.play();
            self.endBell.once('complete', () => {
                self.scene.start('endscene');
            });
        })

        this.socket.on('playerChoice', number => {
            self.playerSlot.setTexture(`card${number}`).setAlpha(1);
            self.playerNums = self.playerNums.filter(num => num != number);
            let card = self.playerDeck.getChildren().filter(card => card.number == number)[0];
            card.setInactive();
            self.cardPlace.play();
        });

        this.socket.on('opponentChoice', number => {
            self.opponentSlot.setTexture(`card${number}`).setAlpha(1);
            let card = self.opponentDeck.getChildren().filter(card => card.number == 13)[0];
            if(card) {
                card.setActive(number);
            }
            self.cardPlace.play();
        });

        this.socket.on('turn', () => {
            self.playerTurn = true;
            self.playerRack.setTexture('rackA');
        });

        this.socket.on('reward', number => {
            self.opponentSlot.setAlpha(0.25);
            self.playerSlot.setAlpha(0.25);

            if(number == -1) {
                // Opponent scored.
                let card = self.opponentDeck.getChildren().filter(card => card.number != 13)[0];
                card.setActive(13);
            } else if(number > 0) {
                self.playerNums.push(number);
                let card = self.playerDeck.getChildren().filter(card => card.number == 0)[0];
                card.setActive(13);
                self.tweens.add({
                    targets: card,
                    scaleX: '+=0.25',
                    scaleY: '+=0.25',
                    duration: 300,
                    ease: 'Linear',
                    yoyo: true,
                    onComplete: function() { card.setActive(number) }
                });
            }
        });
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

class EndScene extends Phaser.Scene {
    constructor() {
        super('endscene');
    }

    preload() {
        this.load.image('won', '../assets/won.png');
        this.load.image('lost', '../assets/lost.png');
        this.load.image('title', '../assets/numberoli.png');
        this.load.image('footer', '../assets/footer.png');
        this.load.image('next', '../assets/next.png');
    }

    create() {
        let self = this;

        let x = config.width / 2;
        let y = config.height;

        this.add.image(x, 60, 'title');
        if(GAMEDATA.reward >= 0) {
            this.add.image(x, y / 2, 'won');
            this.add.text(x - 20, y / 2 + 25, `12 + ${GAMEDATA.reward}`,
                {
                    fontFamily: 'Changa',
                    fontSize: '16px',
                    color: '#f0874d',
                    fontStyle:'bold'
                });
        } else {
            this.add.image(x, y / 2, 'lost');
            this.add.text(x - 20, y / 2 + 25, '-12',
                {
                    fontFamily: 'Changa',
                    fontSize: '16px',
                    color: '#f0874d',
                    fontStyle:'bold'
                });
        }

        this.add.text(x - 10, y / 2 - 27, GAMEDATA.enemy,
            {
                fontFamily: 'Changa',
                fontSize: '13px',
                color: '#7869ac',
                fontStyle:'bold'
            });
        this.add.text(x, y / 2 + 80, `${GAMEDATA.cash}`,
            {
                fontFamily: 'Changa',
                fontSize: '40px',
                color: '#b9d370',
                fontStyle:'bold'
            });

        this.add.image(x, y - 95, 'next').setScale(0.75).setInteractive().on('pointerdown', () => {
            location.reload();
        });

        this.add.image(x, y - 40, 'footer');
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////

function setPlayerName() {
    let name = localStorage.getItem('NPname');
    if(!name) {
        while(!name) {
            name = window.prompt('Enter Player Name');
            if(name) {
                name = name.trim()
            }
        }
        localStorage.setItem('NPname', name);
        localStorage.setItem('NPcash', 120);
    }
    GAMEDATA.name = name;
    GAMEDATA.cash = +localStorage.getItem('NPcash');
}

function addEmotes(scene) {
    scene.anims.create({
        key: 'laughAnim',
        frames: scene.anims.generateFrameNumbers('laugh'),
        frameRate: 24,
        repeat: 0,
        showOnStart: true,
        hideOnComplete: true
    });
    scene.anims.create({
            key: 'cryAnim',
            frames: scene.anims.generateFrameNumbers('cry'),
            frameRate: 24,
            repeat: 0,
            showOnStart: true,
            hideOnComplete: true
        });
    scene.anims.create({
            key: 'teaseAnim',
            frames: scene.anims.generateFrameNumbers('tease'),
            frameRate: 24,
            repeat: 0,
            showOnStart: true,
            hideOnComplete: true
        });
    scene.anims.create({
            key: 'swearAnim',
            frames: scene.anims.generateFrameNumbers('swear'),
            frameRate: 24,
            repeat: 0,
            showOnStart: true,
            hideOnComplete: true
        });
    scene.anims.create({
            key: 'sleepAnim',
            frames: scene.anims.generateFrameNumbers('sleep'),
            frameRate: 24,
            repeat: 0,
            showOnStart: true,
            hideOnComplete: true
        });

    scene.emotes = scene.add.group();

    let x = scene.playerRack.x  - 165;
    let y = scene.playerRack.y - 55;

    scene.emotes.add(scene.add.image(x + 25, y - 115, 'rack').setAlpha(0.375).setScale(0.625).setAngle(90));

    x += 25;
    y -= 195;

    scene.emotes.addMultiple([
        new Emote(scene, x, y, 'laugh'),
        new Emote(scene, x, y + 40, 'cry'),
        new Emote(scene, x, y + 80, 'swear'),
        new Emote(scene, x, y + 120, 'tease'),
        new Emote(scene, x, y + 160, 'sleep')
    ]);
}

function showInterface(scene) {
    let x = config.width / 2;
    let y = config.height;

    scene.playerRack = scene.add.image(x - 10, y - 70, 'rack');
    scene.add.image(x - 10, 70, 'rack');
    scene.add.image(x - 10, y / 2, 'slotPanel').setScale(1.25);

    scene.playerEmote = scene.add.sprite(x - 10, y - 160, 'laugh').setVisible(false);
    scene.opponentEmote = scene.add.sprite(x - 10, 150, 'laugh').setVisible(false);
}

function setUpEmoteNChat(scene) {
    let x = scene.playerRack.x - 140;
    let y = scene.playerRack.y - 55;

    scene.toggle = scene.add.image(x, y, 'toggle').setInteractive().toggleFlipY();
    scene.toggle.on('pointerup', () => {
        toggleEmotes(scene);
    });

    scene.playerMsg = scene.add.text(x + 50, y - 50, '', {
        fontFamily: 'Changa',
        fontStyle: 'bold',
        fontSize: '16px',
        backgroundColor: '#ffffff',
        color: '#0f2f48',
        align: 'center',
        padding: 5,
        fixedWidth: 180,
        fixedHeight: 25,
    }).setAlpha(0);
    scene.opponentMsg = scene.add.text(x + 50, 150, '', {
        fontFamily: 'Changa',
        fontStyle: 'bold',
        fontSize: '16px',
        backgroundColor: '#ffffff',
        color: '#0f2f48',
        align: 'center',
        padding: 5,
        fixedWidth: 180,
        fixedHeight: 25,
    }).setAlpha(0);

    addEmotes(scene);

    scene.chat = scene.add.image(x + 275, y, 'chat').setInteractive();
    scene.chat.on('pointerup', () => {
        let msg = prompt('Enter message [ MAX 15 CHARS ]', 'Play fast !');
        if(msg) {
            if(msg.trim()) {
                msg = msg.slice(0, 15);
                scene.socket.emit('chat', msg);

                scene.playerMsg.setText(msg).setAlpha(1);
                let tID = setTimeout(function() {
                    scene.playerMsg.setAlpha(0);
                    clearTimeout(tID);
                }, 1000);
            }
        }
    });
}


function toggleEmotes(scene) {
    scene.emotes.toggleVisible();
    scene.toggle.toggleFlipY();
}

function showSlots(scene) {
    let gap = (config.width - 138) / 2 - 10;
    let x = 32 + gap;
    let y = config.height / 2;
    scene.playerSlot = new Card(scene, x, y, 0);
    x += 64 + 10;
    scene.opponentSlot = new Card(scene, x, y, 0);
}

function showPlayerDeck(scene) {
    let gap = (config.width - 340) / 2;
    let x = 24 + gap;
    let y = scene.playerRack.y;
    [1,2,3,4,5].forEach(() => {
        scene.playerDeck.add(new Card(scene, x, y, 13));
        x += 48 + 20 ;
    });
}

function updatePlayerDeck(scene, cardNumbers) {
    cardNumbers.forEach((number, index) => {
        let card = scene.playerDeck.getChildren()[index];
        card.number = number;
        card.setTexture(`card${number}`);
        card.setInteractive();
    });
}

function showOpponentDeck(scene) {
    let gap = (config.width - 340) / 2;
    let x = 24 + gap;
    let y = 70;
    [1,2,3,4,5].forEach(() => {
        scene.opponentDeck.add(new Card(scene, x, y, 13));
        x += 48 + 20 ;
    });
}


//////////////////////////////////////////////////////////////////////////////////////////////////////


const config = {
    type: Phaser.AUTO,
    width: window.innerWidth + 15,
    height: window.innerHeight,
    parent: 'gameDiv',
    backgroundColor: '#000000',
    dom: {
        createContainer: true
    },
    scene: [HomeScene, GameScene, EndScene]
}

const game = new Phaser.Game(config);