var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {

  game.load.spritesheet('man', 'assets/man.png', 32, 32);
  game.load.spritesheet('wolf', 'assets/wolf.png', 32, 32);
  game.load.spritesheet('props', 'assets/props.png', 32, 32);
  game.load.image('smoke', 'assets/smoke.png');
  game.load.image('blood', 'assets/blood.png');

}

// Constants
const PROPS_TREE = 0;
const PROPS_ROCK_1 = 1;
const PROPS_ROCK_2 = 2;
const PROPS_ROCK_3 = 3;
const PROPS_FARM_1 = 4;
const PROPS_FARM_2 = 5;
const PROPS_FARM_3 = 6;
const PROPS_FARM_4 = 7;

// Variables
var world;
var bloodEmitter;
var blueTeam = [];
var redTeam = [];
var trees = [];

function create() {
  game.stage.backgroundColor = '#dfdad2';

  // Create World
  world = game.add.group();
  randomTrees();
  //randomRocks();

  // Blood emitters
  createBloodEmitter();

  // Create man
  /*for (var i = 0; i < 25; i++) {
    createMan(-100, game.rnd.integerInRange(0, game.height), game.rnd.integerInRange(90, 100), blueTeam);
    createWolf(-100, game.rnd.integerInRange(0, game.height), game.rnd.integerInRange(90, 100), blueTeam);
    createMan(game.width+100, game.rnd.integerInRange(0, game.height), -game.rnd.integerInRange(90, 100), redTeam);
    createWolf(game.width+100, game.rnd.integerInRange(0, game.height), -game.rnd.integerInRange(90, 100), redTeam);
  }*/

  for (var i = 0; i < 10; i++) {
    toStateFarm(createMan(game.rnd.integerInRange(0, game.width), game.rnd.integerInRange(game.height+100, game.height+200), 80, blueTeam), 100 + i*48, 400);
    toStateTree(createMan(game.rnd.integerInRange(0, game.width), game.rnd.integerInRange(game.height+100, game.height+200), 80, blueTeam));
  }
}

function update() {

  game.physics.arcade.overlap(blueTeam, redTeam, function(blue, red) {
      if (game.rnd.integerInRange(0, 100) > 50) {
        toStateDead(red);
      } else {
        toStateDead(blue);
      }
  });

  // Man state machine
  blueTeam.forEach(function(entity) {
    switch(entity.state) {
      case 'state_farm':
        stateFarm(entity);
        break;
      case 'state_tree':
        stateTree(entity);
        break;
      case 'state_axe':
        stateAxe(entity);
        break;
      case 'state_hoe':
        stateHoe(entity);
        break;
    }

    var dir = entity.body.velocity.x >= 0 ? 1 : -1;
    entity.scale.x = dir;
  });

  world.sort('y');
}

function render() {
  game.debug.body(world);
}
//------------------------------------WORLD-----------------------------------\\
function randomTrees() {
  var tree;
  for (var i = 0; i < 20; i++) {
    tree = world.create(game.rnd.integerInRange(0, game.width), game.rnd.integerInRange(0, 300), 'props');
    tree.anchor.set(0.5);
    tree.frame = PROPS_TREE;
    trees.push(tree);
  }
}

function randomRocks() {
  var rock;
  for (var i = 0; i < 20; i++) {
    rock = world.create(game.rnd.integerInRange(0, game.width), game.rnd.integerInRange(0, game.height), 'props');
    rock.anchor.set(0.5);
    rock.frame = game.rnd.integerInRange(PROPS_ROCK_1, PROPS_ROCK_3);
  }
}
//----------------------------------ENTITIES----------------------------------\\
function toStateFarm(entity, x, y) {
  entity.state = 'state_farm';
  entity.runEmitter.on = false;
  entity.animations.play('walk');
  entity.farmX = x;
  entity.farmY = y;
  game.physics.arcade.moveToXY(entity, x, y, entity.speed);
}

function toStateTree(entity) {
    entity.state = 'state_tree';
    entity.runEmitter.on = false;
    entity.animations.play('walk');

    var minDist = Number.MAX_SAFE_INTEGER;
    for (var i = 0; i < trees.length; i++) {
      var dist = game.physics.arcade.distanceBetween(entity, trees[i]);
      if (dist < minDist && !trees[i].cutter) {
        minDist = dist;
        if (entity.tree) { entity.tree.cutter = null; }
        entity.tree = trees[i];
        entity.tree.cutter = entity;
      }
    }

    game.physics.arcade.moveToXY(entity, entity.tree.position.x-16, entity.tree.position.y+8, entity.speed);
}

function toStateAxe(entity) {
  entity.state = 'state_axe';
  entity.runEmitter.on = false;
  entity.body.velocity.set(0,0);
  entity.animations.play('axe');

  entity.animations.currentAnim.onLoop.add(function() {
    game.add.tween(entity.tree)
      .to({ x: entity.tree.position.x-1 }, 50, Phaser.Easing.Linear.None)
      .to({ x: entity.tree.position.x+1 }, 50, Phaser.Easing.Linear.None)
      .to({ x: entity.tree.position.x }, 50, Phaser.Easing.Linear.None).start();
  });
}

function toStateHoe(entity) {
  entity.state = 'state_hoe';
  entity.runEmitter.on = false;
  entity.body.velocity.set(0,0);
  entity.animations.play('hoe');

  // Add farm
  entity.farm = game.add.sprite(entity.position.x + 20, entity.position.y + 4, 'props');
  entity.farm.z = -100;
  entity.farm.anchor.set(0.5);
  entity.farm.frame = PROPS_FARM_1;
  entity.animations.currentAnim.onLoop.add(function() {
    if (entity.farm.frame === PROPS_FARM_4) {
      entity.farm.frame = PROPS_FARM_1;
    } else {
      entity.farm.frame += 1;
    }
  });
}

function stateFarm(entity) {
  if (game.physics.arcade.distanceToXY(entity, entity.farmX, entity.farmY) <= 2) {
    toStateHoe(entity);
  }
}

function stateTree(entity) {
  if (game.physics.arcade.distanceToXY(entity, entity.tree.position.x-16, entity.tree.position.y+8) <= 2) {
    toStateAxe(entity);
  }
}

function stateAxe(entity) {

}

function stateHoe(entity) {

}
//----------------------------------CREATION----------------------------------\\
function createMan(x, y, speed, group) {
  var man = world.create(x, y, 'man');
  man.anchor.set(0.5);
  game.physics.arcade.enable(man);
  man.animations.add('idle', [0, 1, 2, 3], 8, true);
  man.animations.add('walk', [4, 5], 8, true);
  man.animations.add('run', [6, 7], 8, true);
  man.animations.add('axe', [8, 9], 2, true);
  man.animations.add('hoe', [10, 11], 2, true);
  group.push(man);
  man.speed = speed;
  man.body.velocity.x = speed;

  attachSmoke(man);

  return man;
}

function createWolf(x, y, speed, group) {
  var wolf = world.create(x, y, 'wolf');
  wolf.anchor.set(0.5);
  game.physics.arcade.enable(wolf);
  wolf.animations.add('idle', [0, 1], 8, true);
  wolf.animations.add('walk', [2, 3], 8, true);
  wolf.animations.add('run', [4, 5, 6, 7], 8, true);
  wolf.animations.play('run');
  wolf.state = 'state_idle';
  group.push(wolf);
  wolf.body.velocity.x = speed;

  var dir = wolf.body.velocity.x >= 0 ? 1 : -1;
  wolf.scale.x = dir;

  attachSmoke(wolf);
}

function attachSmoke(entity) {
  entity.runEmitter = game.add.emitter(-12, 4, 16);
  entity.runEmitter.makeParticles('smoke');
  entity.runEmitter.gravity = -32;
  entity.runEmitter.setRotation(0, 0);
  entity.runEmitter.minParticleScale = 0.5;
  entity.runEmitter.maxParticleScale = 1;
  entity.runEmitter.setXSpeed(-16, -32);
  entity.runEmitter.setYSpeed(0, 0);
  entity.runEmitter.alpha = 0.7;
  entity.runEmitter.start(false, 1000, 200);
  entity.addChild(entity.runEmitter);
}

function createBloodEmitter() {
  bloodEmitter = game.add.emitter(0, 0, 1024);
  bloodEmitter.makeParticles('blood');
  bloodEmitter.gravity = 200;
}

function toStateDead(entity) {
  blood(entity.position.x, entity.position.y);
  entity.state = 'state_dead';
  entity.kill();
}
//-------------------------------------SFX-------------------------------------\\
function blood(x, y) {
  bloodEmitter.x = x;
  bloodEmitter.y = y;
  bloodEmitter.start(true, 1000, null, 8);
}
