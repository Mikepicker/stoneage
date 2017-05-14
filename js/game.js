var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render }, false, false);

function preload() {

  game.load.spritesheet('man', 'assets/man.png', 32, 32);
  game.load.spritesheet('wolf', 'assets/wolf.png', 32, 32);
  game.load.spritesheet('props', 'assets/props.png', 32, 32);
  game.load.spritesheet('mammoth', 'assets/mammoth.png', 64, 32);
  game.load.spritesheet('farm', 'assets/farm.png', 32, 32);
  game.load.spritesheet('cottage', 'assets/cottage.png', 32, 32);
  game.load.spritesheet('tools', 'assets/tools.png', 32, 32);
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
var farms;
var bloodEmitter;
var blueTeam = [];
var redTeam = [];
var trees = [];
var props = [];
var houses = [];
var buildingMenu;
var buildingToPlace = null;
var buildingBlueprints = [];
var builder;

function create() {
  game.stage.backgroundColor = '#dfdad2';

  // Create World
  farms = game.add.group();
  world = game.add.group();
  randomTrees();
  randomRocks();

  // Blood emitters
  createBloodEmitter();

  // UI
  createUI();

  // Create man
  /*for (var i = 0; i < 25; i++) {
    createMan(-100, game.rnd.integerInRange(0, game.height), game.rnd.integerInRange(90, 100), blueTeam);
    createWolf(-100, game.rnd.integerInRange(0, game.height), game.rnd.integerInRange(90, 100), blueTeam);
    createMan(game.width+100, game.rnd.integerInRange(0, game.height), -game.rnd.integerInRange(90, 100), redTeam);
    createWolf(game.width+100, game.rnd.integerInRange(0, game.height), -game.rnd.integerInRange(90, 100), redTeam);
  }*/

  for (var i = 0; i < 30; i++) {
    createMammoth(-100, game.rnd.integerInRange(32, game.height-32), game.rnd.integerInRange(80, 100));
    createWolf(-200, game.rnd.integerInRange(32, game.height-32), game.rnd.integerInRange(90, 110), blueTeam);
  }

  builder = createMan(400, 400, 80, blueTeam);
  toStateIdle(builder);

  // Place new building
  game.input.onDown.add(function() {

    // Open menu
    if (!buildingToPlace) {
      buildingMenu.position.x = game.input.activePointer.x;
      buildingMenu.position.y = game.input.activePointer.y;

      game.add.tween(buildingMenu)
        .to({ alpha: 1 }, 100, Phaser.Easing.Linear.None)
        .start();
    }

    // Place building
    if (buildingToPlace && !buildingToPlace.overlapping) {
      buildingBlueprints.push(buildingToPlace);
      buildingToPlace = null;

      if (buildingBlueprints.length > 0 && builder.state != 'state_build') {
        toStateMove(builder, game.input.x-32, game.input.y, toStateBuild);
      }
    }
  });

  game.input.onUp.add(function(pointer)  {

    if (!pointer.withinGame) {
      return;
    }

    // Selected button
    if (buildingMenu.hoe.scale.x === 2) {
      createBuildingToPlace('farm');
    } else if (buildingMenu.axe.scale.x === 2) {
      createBuildingToPlace('cottage');
    }

    game.add.tween(buildingMenu)
      .to({ alpha: 0 }, 100, Phaser.Easing.Linear.None)
      .start();

  });
}

function update() {

  updateGameState();
  updateEntities();

}

function render() {
}
//------------------------------UPDATE GAME STATE------------------------------\\
function updateGameState() {

  if (buildingToPlace) {

    // Building to place
    buildingToPlace.position.x = game.input.activePointer.x;
    buildingToPlace.position.y = game.input.activePointer.y;

    // Check for collisions
    buildingToPlace.tint = 0xffffff;
    buildingToPlace.overlapping = false;
    buildingToPlace.box.tint = 0x75b453;
    game.physics.arcade.overlap(buildingToPlace.box, world, function(building, entity) {
      buildingToPlace.overlapping = true;
      buildingToPlace.box.tint = 0xd66f6f;
    });

  }

  // Handle building selection
  if (!buildingMenu.closed) {

    var dist = Phaser.Point.subtract(game.input.activePointer, buildingMenu.position);

    // Scale buttons
    var hoeScale = Phaser.Math.clamp(-dist.x/10, 1, 2);
    var spearScale = Phaser.Math.clamp(-dist.y/10, 1, 2);
    var axeScale = Phaser.Math.clamp(dist.x/10, 1, 2);

    hoeScale = Phaser.Math.max(hoeScale/spearScale, 1);
    axeScale = Phaser.Math.max(axeScale/spearScale, 1);

    buildingMenu.hoe.scale.set(hoeScale);
    buildingMenu.spear.scale.set(spearScale);
    buildingMenu.axe.scale.set(axeScale);
  }
}
//-------------------------------UPDATE ENTITIES-------------------------------\\
function updateEntities() {

  // Overlap
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
      case 'state_idle':
        stateIdle(entity);
        break;
      case 'state_move':
        stateMove(entity);
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
      case 'state_build':
        stateBuild(entity);
        break;
    }

    var dir = entity.body.velocity.x >= 0 ? 1 : -1;
    entity.scale.x = dir;
  });

  world.sort('y');

}

function toStateIdle(entity) {
  entity.state = 'state_idle';
  entity.runEmitter.on = false;
  entity.body.velocity.set(0,0);
  entity.animations.play('idle');
}

function toStateMove(entity, x, y, callback) {
  entity.state = 'state_move';
  entity.runEmitter.on = false;
  entity.animations.play('walk');
  entity.moveCallback = callback;
  entity.moveToX = x;
  entity.moveToY = y;
  game.physics.arcade.moveToXY(entity, x, y, entity.speed);
}

function toStateTree(entity) {
    entity.state = 'state_tree';
    entity.runEmitter.on = false;
    entity.animations.play('walk');

    entity.tree = closestTree(entity);
    entity.tree.cutter = entity;

    game.physics.arcade.moveToXY(entity, entity.tree.position.x-16, entity.tree.position.y+8, entity.speed);
}

function toStateAxe(entity) {
  entity.state = 'state_axe';
  entity.runEmitter.on = false;
  entity.body.velocity.set(0,0);
  entity.animations.play('axe');

  entity.animations.currentAnim.onLoop.add(function() {

    if (entity.tree.wood <= 0) {

      var tween = game.add.tween(entity.tree)
        .to({ alpha: 0 }, 100, Phaser.Easing.Linear.None).start();

      tween.onComplete.add(function() { entity.tree.kill(); });

      toStateTree(entity);

    } else {

      entity.tree.wood -= 1;
      game.add.tween(entity.tree)
        .to({ x: entity.tree.position.x-1 }, 50, Phaser.Easing.Linear.None)
        .to({ x: entity.tree.position.x+1 }, 50, Phaser.Easing.Linear.None)
        .to({ x: entity.tree.position.x }, 50, Phaser.Easing.Linear.None).start();

    }

  });
}

function toStateHoe(entity) {
  entity.state = 'state_hoe';
  entity.runEmitter.on = false;
  entity.body.velocity.set(0,0);
  entity.animations.play('hoe');

  // Add farm
  entity.farm = farms.create(entity.position.x + 20, entity.position.y + 4, 'props');
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

function toStateBuild(entity) {
  entity.state = 'state_build';
  entity.runEmitter.on = false;
  entity.body.velocity.set(0,0);
  var anim = entity.animations.play('axe');

  var buildingBlueprint = buildingBlueprints.pop();
  var buildingType = buildingBlueprint.buildingType;

  // Add farm
  entity.building = game.add.sprite(entity.position.x + 32, entity.position.y, buildingType);
  houses.push(entity.building);
  entity.building.z = -100;
  entity.building.anchor.set(0.5);

  buildingBlueprint.kill();

  anim.onLoop.add(function() {
    if (entity.building.frame === 3) {

      // Construct next buildings
      if (buildingBlueprints.length > 0) {
        var next = buildingBlueprints[buildingBlueprints.length-1];
        toStateMove(entity, next.position.x-32, next.position.y, toStateBuild);
      } else {
        toStateIdle(entity);
      }

      if (buildingType === 'farm') {

        // Spawn 4 farmers
        toStateMove(createMan(entity.building.position.x - 32, entity.position.y + 8, 100, blueTeam), entity.building.position.x - 40, entity.building.position.y + 32, toStateHoe);
        toStateMove(createMan(entity.building.position.x, entity.position.y + 8, 100, blueTeam), entity.building.position.x - 40, entity.building.position.y + 64, toStateHoe);
        toStateMove(createMan(entity.building.position.x + 32, entity.position.y + 8, 100, blueTeam), entity.building.position.x + 20, entity.building.position.y + 32, toStateHoe);
        toStateMove(createMan(entity.building.position.x + 64, entity.position.y + 8, 100, blueTeam), entity.building.position.x + 20, entity.building.position.y + 64, toStateHoe);

      } else if (buildingType === 'cottage') {

        // Spawn 4 wood cutters
        toStateTree(createMan(entity.building.position.x - 32, entity.position.y + 8, 100, blueTeam));
        toStateTree(createMan(entity.building.position.x, entity.position.y + 8, 100, blueTeam));
        toStateTree(createMan(entity.building.position.x + 32, entity.position.y + 8, 100, blueTeam));
        toStateTree(createMan(entity.building.position.x + 64, entity.position.y + 8, 100, blueTeam));

      }

      anim.onLoop.dispose();

    } else {
      entity.building.frame += 1;
    }
  });
}

function toStateDead(entity) {
  blood(entity.position.x, entity.position.y);
  entity.state = 'state_dead';
  entity.kill();
}

function stateIdle(entity) {

}

function stateMove(entity) {
  if (game.physics.arcade.distanceToXY(entity, entity.moveToX, entity.moveToY) <= 2) {
    entity.moveCallback(entity);
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

function stateBuild(entity) {

}

function closestTree(entity) {

  var tree;
  var minDist = Number.MAX_SAFE_INTEGER;
  for (var i = 0; i < trees.length; i++) {
    var dist = game.physics.arcade.distanceBetween(entity, trees[i]);
    if (dist < minDist && !trees[i].cutter) {
      minDist = dist;
      tree = trees[i];
    }
  }
  return tree;
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
  man.alpha = 0;
  group.push(man);
  man.speed = speed;
  man.body.velocity.x = speed;

  game.add.tween(man).to({ alpha: 1 }, 500, Phaser.Easing.Linear.None).start();

  attachSmoke(man, -12, 4);

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

  attachSmoke(wolf, -12, 4);
}

function createMammoth(x, y, speed) {
  var mammoth = world.create(x, y, 'mammoth');
  mammoth.anchor.set(0.5);
  game.physics.arcade.enable(mammoth);
  mammoth.animations.add('idle', [0, 1], 8, true);
  mammoth.animations.add('walk', [2, 3, 4, 5], 8, true);
  mammoth.animations.play('walk');

  mammoth.body.velocity.x = speed;
  var dir = mammoth.body.velocity.x >= 0 ? 1 : -1;
  mammoth.scale.x = dir;

  attachSmoke(mammoth, -18, 8);
}

function attachSmoke(entity, x, y) {
  entity.runEmitter = game.add.emitter(x, y, 16);
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

function createBuildingToPlace(type) {
  buildingToPlace = game.add.sprite(game.input.x, game.input.y, type);
  buildingToPlace.buildingType = type;
  buildingToPlace.anchor.set(0.5);
  buildingToPlace.frame = 3;
  buildingToPlace.alpha = 0.5;

  // Bounding box
  var box = game.add.bitmapData(100, 110);
  box.ctx.beginPath();
  box.ctx.rect(0, 0, 100, 110);
  box.ctx.fillStyle = '#fff';
  box.ctx.globalAlpha = 0.5;
  box.ctx.fill();
  buildingToPlace.box = game.add.sprite(0, 40, box);
  buildingToPlace.box.anchor.set(0.5);
  game.physics.arcade.enable(buildingToPlace.box);
  buildingToPlace.addChild(buildingToPlace.box);
}

function randomTrees() {
  var tree;
  for (var i = 0; i < 20; i++) {
    tree = world.create(game.rnd.integerInRange(0, game.width), game.rnd.integerInRange(0, 300), 'props');
    game.physics.arcade.enable(tree);
    tree.anchor.set(0.5);
    tree.frame = PROPS_TREE;
    tree.wood = 10;
    trees.push(tree);
    props.push(tree);
  }
}

function randomRocks() {
  var rock;
  for (var i = 0; i < 10; i++) {
    rock = world.create(game.rnd.integerInRange(0, game.width), game.rnd.integerInRange(0, 300), 'props');
    game.physics.arcade.enable(rock);
    rock.anchor.set(0.5);
    rock.frame = game.rnd.integerInRange(PROPS_ROCK_1, PROPS_ROCK_3);
    props.push(rock);
  }
}

function createUI() {
  buildingMenu = game.add.group();
  buildingMenu.alpha = 0;

  var hoe = game.add.sprite(-32, 0, 'tools');
  hoe.anchor.set(0.5);
  hoe.frame = 0;

  var spear = game.add.sprite(0, -32, 'tools');
  spear.anchor.set(0.5);
  spear.frame = 1;

  var axe = game.add.sprite(32, 0, 'tools');
  axe.anchor.set(0.5);
  axe.frame = 2;

  buildingMenu.add(hoe);
  buildingMenu.hoe = hoe;

  buildingMenu.add(spear);
  buildingMenu.spear = spear;

  buildingMenu.add(axe);
  buildingMenu.axe = axe;
}
//-------------------------------------SFX-------------------------------------\\
function blood(x, y) {
  bloodEmitter.x = x;
  bloodEmitter.y = y;
  bloodEmitter.start(true, 1000, null, 8);
}
