//------------------------------------------------------------------------//
//                                                                        //
//    Spell List, Spell Slot, and Spell School Assignments for NPCS       //
//                                                                        //
//------------------------------------------------------------------------//
function selectSpells(archetype, level) {
  const archetypeCapitalized =
    archetype.charAt(0).toUpperCase() + archetype.slice(1).toLowerCase();
  const spellCastingType =
    archestats["spell_cast"][archestats["Archetype"].indexOf(archetype)];

  // Assign the spell schools, defaulting to "Universal" if null or "none"
  let spellSchool1 =
    archestats["spell_school1"][archestats["Archetype"].indexOf(archetype)] ||
    "Universal";
  let spellSchool2 =
    archestats["spell_school2"][archestats["Archetype"].indexOf(archetype)] ||
    "none";

  console.log(
    `${archetypeCapitalized} Initial spellSchool1: ${spellSchool1}, spellSchool2: ${spellSchool2}`
  ); // Debugging line

  let spellSlots;
  if (spellCastingType === "full") {
    spellSlots = fullcasterSpellslots;
  } else if (spellCastingType === "half") {
    spellSlots = halfcasterSpellslots;
  } else if (spellCastingType === "partial") {
    spellSlots = partialcasterSpellslots;
  } else {
    return {
      spellsSelected: [],
      usedSchool: "Universal",
      spellSchool2: "none",
    };
  }

  let spellsSelected = [];
  let usedSchool = spellSchool1;

  for (let rank = 0; rank <= 10; rank++) {
    const rankKey = `rank${rank}_total`;
    if (!spellSlots[rankKey] || level - 1 >= spellSlots[rankKey].length) {
      continue;
    }

    let spellCount = spellSlots[rankKey][level - 1];

    // Skip the rank if spellList["rank_X"] is undefined
    if (!spellList[`rank_${rank}`]) {
      console.warn(
        `spellList["rank_${rank}"] is undefined. Skipping rank ${rank}.`
      );
      continue;
    }

    // Assign a random spell school if the current one is "none" or "null"
    if (usedSchool === "none" || usedSchool === "null" || !usedSchool) {
      const availableSchools = new Set(spellList[`rank_${rank}_school`] || []);
      availableSchools.delete("none");
      if (availableSchools.size > 0) {
        usedSchool =
          Array.from(availableSchools)[
            Math.floor(Math.random() * availableSchools.size)
          ];
        spellSchool1 = usedSchool; // Lock the caster into this spell school
        console.log(`Assigned new spellSchool1: ${spellSchool1}`); // Debugging line
      } else {
        usedSchool = "Universal"; // Default to "Universal" if no valid schools are available
        spellSchool1 = usedSchool;
        console.log(`Fallback to Universal spellSchool1: ${spellSchool1}`); // Debugging line
      }
    }

    let rankSpells = spellList[`rank_${rank}`].filter(
      (spell, i) => spellList[`rank_${rank}_school`][i] === usedSchool
    );

    rankSpells.sort(() => Math.random() - 0.5); // Shuffle
    spellsSelected = spellsSelected.concat(
      rankSpells.slice(0, Math.min(spellCount, rankSpells.length))
    );
  }

  // Ensure a valid spell school name is used in the display
  let primarySchool = usedSchool || "Universal";
  let secondarySchool =
    spellSchool2 && spellSchool2 !== "none" ? spellSchool2 : null;

  console.log(
    `Final primarySchool: ${primarySchool}, secondarySchool: ${secondarySchool}`
  ); // Debugging line

  return {
    spellsSelected,
    usedSchool: primarySchool,
    spellSchool2: secondarySchool,
  };
}

//------------------------------------------------------------------------//
//                                                                        //
//   Assignment for Talents and the total points to buy Talents for NPC   //
//                                                                        //
//------------------------------------------------------------------------//

function selectTalents(archetype, level, includeUniversal, includeRare) {
  const archetypeKey = `${archetype.toLowerCase()}_atfoptions`;
  console.log(`Looking for talents using key: ${archetypeKey}`);
  const talentData = window[archetypeKey];

  if (!talentData) {
    console.error(`No talent data found for archetype: ${archetype}`);
    return [];
  }

  let availablePoints = atfpointbuy["atf_points"][level - 1];
  let selectedTalents = [];
  let remainingPoints = availablePoints;

  let archetypeTalents = talentData["atf_name"].map((name, index) => {
    return {
      name: name,
      info: talentData["atf_info"][index],
      cost: talentData["atf_cost"][index],
    };
  });

  // Shuffle talents to introduce randomness
  archetypeTalents.sort(() => Math.random() - 0.5);

  // Select the first two talents from archetypeTalents
  for (
    let i = 0;
    i < archetypeTalents.length && selectedTalents.length < 2;
    i++
  ) {
    let talent = archetypeTalents[i];
    if (remainingPoints >= talent.cost) {
      selectedTalents.push({ name: talent.name, info: talent.info });
      remainingPoints -= talent.cost;
    }
  }

  // Create a combined pool of remaining talents
  let combinedTalents = [...archetypeTalents];

  if (includeUniversal && window.universal_atfoptions) {
    let universalTalents = window.universal_atfoptions["atf_name"].map(
      (name, index) => {
        return {
          name: name,
          info: window.universal_atfoptions["atf_info"][index],
          cost: window.universal_atfoptions["atf_cost"][index],
        };
      }
    );
    combinedTalents = combinedTalents.concat(universalTalents);
  }

  if (includeRare && window.rare_atfoptions) {
    let rareTalents = window.rare_atfoptions["atf_name"].map((name, index) => {
      return {
        name: name,
        info: window.rare_atfoptions["atf_info"][index],
        cost: window.rare_atfoptions["atf_cost"][index],
      };
    });
    combinedTalents = combinedTalents.concat(rareTalents);
  }

  // Shuffle combined talents to introduce randomness
  combinedTalents.sort(() => Math.random() - 0.5);

  // Select additional talents from the combined pool
  for (let talent of combinedTalents) {
    if (remainingPoints >= talent.cost) {
      selectedTalents.push({ name: talent.name, info: talent.info });
      remainingPoints -= talent.cost;
    }
    if (remainingPoints <= 0) break; // Stop if no points remain
  }

  return selectedTalents;
}

//------------------------------------------------------------------------//
//                                                                        //
//                 NPC Generation Logic and Formatting                    //
//                                                                        //
//------------------------------------------------------------------------//
function generateNPC(
  level,
  archetype,
  difficulty,
  isSpellcaster,
  includeUniversal,
  includeRare
) {
  archetype = archetype.trim().toLowerCase();

  // Find the correct index for the archetype
  const archetypeIndex = archestats["Archetype"]
    .map((a) => a.trim().toLowerCase())
    .indexOf(archetype);

  if (archetypeIndex === -1) {
    throw new Error(`Archetype '${archetype}' not found.`);
  }

  // Extract data for the selected archetype
  const archetypeData = {};
  Object.keys(archestats).forEach((key) => {
    archetypeData[key] = archestats[key][archetypeIndex];
  });

  // Map difficulty to appropriate keys
  const difficultyMapping = {
    low: "low",
    mod: "mod",
    high: "high",
    moderate: "mod", // Add this to handle lowercase "moderate"
  };

  const normalizedDifficulty = difficultyMapping[difficulty.toLowerCase()];
  if (!normalizedDifficulty) {
    throw new Error(`Invalid difficulty level: ${difficulty}`);
  }

  const percKey = `${normalizedDifficulty}perc`;
  const acKey = `${normalizedDifficulty}ac`;
  const dmgKey = `${normalizedDifficulty}damage`;

  const hpColumn = `max${difficultyMapping[difficulty.toLowerCase()]}`;
  console.log("hpColumn:", hpColumn); // Debugging line

  if (!hp[hpColumn]) {
    console.error(`Key "${hpColumn}" not found in hp object.`);
    return; // Prevent further execution if the key is not found
  }

  const baseHP = hp[hpColumn][level - 1];
  const hpBonus = archetypeData.hpbonus || 0;
  const totalHP = baseHP + parseInt(hpBonus, 10);

  // Ensure that the perception, armor class, and damage keys are valid
  if (!perception[percKey]) {
    console.error(`Key "${percKey}" not found in perception object.`);
    return;
  }
  if (!armorclass[acKey]) {
    console.error(`Key "${acKey}" not found in armorclass object.`);
    return;
  }
  if (!weapondamage[dmgKey]) {
    console.error(`Key "${dmgKey}" not found in weapondamage object.`);
    return;
  }

  const armorBulk = archetypeData.armorbulk || 0;
  const bulk = archetypeData.bulk || 0;
  const availableBulk = bulk - armorBulk;

  let atbmodMapping;

  if (normalizedDifficulty === "high") {
    atbmodMapping = {
      atbmod1: "highatb",
      atbmod2: "highatb",
      atbmod3: "modatb",
      atbmod4: "lowatb",
      atbmod5: "lowatb",
      atbmod6: "lowatb",
    };
  } else if (normalizedDifficulty === "mod") {
    atbmodMapping = {
      atbmod1: "highatb",
      atbmod2: "modatb",
      atbmod3: "modatb",
      atbmod4: "lowatb",
      atbmod5: "lowatb",
      atbmod6: "lowatb",
    };
  } else if (normalizedDifficulty === "low") {
    atbmodMapping = {
      atbmod1: "modatb",
      atbmod2: "lowatb",
      atbmod3: "lowatb",
      atbmod4: "lowatb",
      atbmod5: "lowatb",
      atbmod6: "lowatb",
    };
  }

  const attributeOrder = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const attributeValues = {};

  for (let attribute of attributeOrder) {
    for (let i = 1; i <= 6; i++) {
      if (archetypeData[`atbmod${i}`] === attribute) {
        const modType = atbmodMapping[`atbmod${i}`];
        attributeValues[attribute] = atbmods[modType][level - 1];
        break;
      }
    }
  }

  const saveMapping = {
    highsave: "highsave",
    modsave: "modsave",
    lowsave: "lowsave",
  };

  const saveValues = {};

  if (normalizedDifficulty === "low") {
    saveValues.Fort =
      savingthrows[saveMapping[archetypeData.fortsave]][Math.max(level - 3, 0)];
    saveValues.Ref =
      savingthrows[saveMapping[archetypeData.refsave]][Math.max(level - 3, 0)];
    saveValues.Will =
      savingthrows[saveMapping[archetypeData.willsave]][Math.max(level - 3, 0)];
  } else if (normalizedDifficulty === "mod") {
    saveValues.Fort =
      savingthrows[saveMapping[archetypeData.fortsave]][Math.max(level - 2, 0)];
    saveValues.Ref =
      savingthrows[saveMapping[archetypeData.refsave]][Math.max(level - 2, 0)];
    saveValues.Will =
      savingthrows[saveMapping[archetypeData.willsave]][Math.max(level - 2, 0)];
  } else {
    saveValues.Fort =
      savingthrows[saveMapping[archetypeData.fortsave]][Math.max(level - 1, 0)];
    saveValues.Ref =
      savingthrows[saveMapping[archetypeData.refsave]][Math.max(level - 1, 0)];
    saveValues.Will =
      savingthrows[saveMapping[archetypeData.willsave]][Math.max(level - 1, 0)];
  }

  // Format NPC data
  const capitalizedArchetype =
    archetype.charAt(0).toUpperCase() + archetype.slice(1);
  const safeLevel = Math.max(level - 1, 0); // Ensure level is at least 0 for indexing

  let npcData = `# ${capitalizedArchetype}\n## **Level** ${level}\n\n --- \n**Perception**: +${
    perception[percKey][safeLevel]
  } (${10 + perception[percKey][safeLevel]})\n**AC**: ${
    armorclass[acKey][safeLevel]
  }; **Fort** +${saveValues.Fort}, **Ref** +${saveValues.Ref}, **Will** +${
    saveValues.Will
  }\n\n**HP:** ${totalHP};\n**Speed:** ${archetypeData.speed} ft\n\n**STR** +${
    attributeValues.STR
  }, **DEX** +${attributeValues.DEX}, **CON** +${
    attributeValues.CON
  }, **INT** +${attributeValues.INT}, **WIS** +${
    attributeValues.WIS
  }, **CHA** +${attributeValues.CHA}\n**Skills:** \n`;

  // Add skills based on skill groups dynamically using refactored keys
  const skillMapping = {
    1: "highskill",
    2: "modskill",
    3: "lowskill",
    4: "lowskill",
  };

  for (let i = 1; i <= 4; i++) {
    const skillKey = `${archetype}skill${i}`;
    const skillName = skillsRefactored[skillKey];
    if (!skillName) continue;

    const skillValue = skillmodifiers[skillMapping[i]][level - 1];
    npcData += `**${skillName}** +${skillValue}, `;
  }

  npcData += "\n\n###### **Talents:**\n\n";
  console.log(`Archetype passed to selectTalents: ${archetype}`);

  // Add talents, including optional universal and rare talents
  const talents = selectTalents(
    archetype,
    level,
    includeUniversal,
    includeRare
  );

  if (talents.length) {
    talents.forEach(({ name, info }) => {
      npcData += `**${name}**: ${info}\n\n`;
    });
  } else {
    npcData += "No talents available\n";
  }

  let weaponsSelected = 0;
  let bulkUsed = 0;

  npcData += "\n\n###### **Actions:**\n\n";
  for (let i = 1; i <= 4; i++) {
    const wepKey = `${archetype}_wep${i}`;
    const weaponGroup = archweaponGroups[wepKey];
    if (weaponGroup && bulkUsed < availableBulk) {
      const weaponsInGroup = weapons["Group"]
        .map((group, index) => (group === weaponGroup ? index : -1))
        .filter((index) => index !== -1);

      weaponsInGroup.sort(() => Math.random() - 0.5);

      for (let weaponIdx of weaponsInGroup) {
        const weaponBulk = weapons["Bulk"][weaponIdx];
        if (bulkUsed + weaponBulk <= availableBulk) {
          const weaponData = {};
          Object.keys(weapons).forEach((key) => {
            weaponData[key] = weapons[key][weaponIdx];
          });

          const dmgKey =
            weaponsSelected === 0
              ? "highdamage"
              : weaponsSelected <= 2
              ? "moddamage"
              : "lowdamage";
          const damageString = weapondamage[dmgKey][level - 1];
          const bonus =
            weaponData["Type"] === "Ranged"
              ? parseInt(atbmods[`${normalizedDifficulty}atb`][level - 1], 10)
              : parseInt(atbmods[`${normalizedDifficulty}atb`][level - 1], 10);
          const strikeHit = 10 + Number(bonus) + Number(level);

          npcData += `**${
            weaponData["Weapons"]
          }** \`[one-action]\` +${strikeHit} [+${strikeHit - 5}/+${
            strikeHit - 10
          }] (${weaponData["Traits"]}), ${
            weaponData["Range"]
          } ${damageString} ${weaponData["Type"]}\n\n`;

          bulkUsed += weaponBulk;
          weaponsSelected++;
          break;
        }
      }

      if (bulkUsed >= availableBulk) break;
    }
  }

  if (isSpellcaster) {
    const { spellsSelected, usedSchool, spellSchool2 } = selectSpells(
      archetype,
      level
    );

    const dc =
      difficulty === "high"
        ? spellStats["highdc"][level - 1]
        : difficulty === "mod"
        ? spellStats["moddc"][level - 1]
        : spellStats["lowdc"][level - 1];

    const sab =
      difficulty === "high"
        ? spellStats["highSAB"][level - 1]
        : difficulty === "mod"
        ? spellStats["modSAB"][level - 1]
        : spellStats["lowSAB"][level - 1];

    let primarySchool =
      usedSchool ||
      archestats["spell_school1"][
        archestats["Archetype"].indexOf(capitalizedArchetype)
      ];
    let secondarySchool =
      spellSchool2 ||
      archestats["spell_school2"][
        archestats["Archetype"].indexOf(capitalizedArchetype)
      ];

    if (primarySchool === "none") {
      primarySchool = "Innate";
    }

    let schoolDisplay;
    if (spellSchool2 && spellSchool2 !== "none" && spellSchool2 !== "null") {
      schoolDisplay = `**${usedSchool} and ${spellSchool2} Spells**`;
    } else {
      schoolDisplay = `**${usedSchool} Spells**`;
    }

    npcData += `\n\n###### **Spells:**\n\n${schoolDisplay}, DC ${dc}, + **${sab}**;\n\n`;

    const spellsByRank = {};
    spellsSelected.forEach((spell) => {
      for (let rank = 0; rank <= 10; rank++) {
        const rankKey = `rank_${rank}`;
        if (spellList[rankKey] && spellList[rankKey].includes(spell)) {
          if (!spellsByRank[rank]) spellsByRank[rank] = [];
          spellsByRank[rank].push(spell);
          break;
        }
      }
    });

    Object.keys(spellsByRank)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((rank) => {
        const rankSpells = spellsByRank[rank].join(", ");
        npcData += `**R${rank}:** *${rankSpells}*\n\n`;
      });
  }

  return npcData;
}

// Mapping from display values to internal values
const difficultyMapping = {
  Low: "low",
  Moderate: "mod",
  High: "high",
};

// Function to handle difficulty conversion and call generateNPC
document
  .getElementById("generate-button")
  .addEventListener("click", async () => {
    const level = document.getElementById("level-input").value;
    const archetype = document.getElementById("archetype-input").value;
    const isSpellcaster = document.getElementById(
      "spellcaster-checkbox"
    ).checked;
    const includeUniversal =
      document.getElementById("universal-checkbox").checked;
    const includeRare = document.getElementById("rare-checkbox").checked;

    // Get the displayed difficulty and map it to the internal value
    const displayedDifficulty = document.querySelector(
      ".difficulty-buttons .selected"
    ).textContent;
    const difficulty = difficultyMapping[displayedDifficulty];

    console.log("Generating NPC with", { level, archetype, difficulty }); // Debugging line
    const npcData = generateNPC(
      level,
      archetype,
      difficulty,
      isSpellcaster,
      includeUniversal,
      includeRare
    );

    console.log("Generated NPC Data:", npcData); // Debugging line
    document.getElementById("npc-display").innerHTML = marked(npcData);
  });

// Function to load the JSON data
async function loadNPCData() {
  try {
    const response = await fetch('./npc_data.json'); // This is where the fetch call goes
    const npcData = await response.json();
    console.log("NPC Data Loaded:", npcData); // This logs the data to ensure it's loaded correctly
    return npcData;
  } catch (error) {
    console.error("Error loading NPC data:", error);
  }
}

// Function to initialize the generator and assign data to global variables
async function initializeGenerator() {
  const npcData = await loadNPCData(); // Calls the function that fetches the JSON data

  if (npcData) {
    window.archestats = npcData.archestats;
    window.atbmods = npcData.atbmods;
    window.perception = npcData.perception;
    window.armorclass = npcData.armorclass;
    window.hp = npcData.hp;
    window.weapons = npcData.weapons;
    window.weapondamage = npcData.weapondamage;
    window.skillsRefactored = npcData.skills_refactored;
    window.skillmodifiers = npcData.skillmodifiers;
    window.archweaponGroups = npcData.archweapon_groups;
    window.savingthrows = npcData.savingthrows;
    window.fullcasterSpellslots = npcData.fullcaster_spellslots;
    window.halfcasterSpellslots = npcData.halfcaster_spellslots;
    window.partialcasterSpellslots = npcData.partialcaster_spellslots;
    window.spellStats = npcData.spell_stats;
    window.archetypeCasting = npcData.archetype_casting;
    window.spellList = npcData.spell_list;
    window.atfpointbuy = npcData.atfpointbuy;
    window.universal_atfoptions = npcData.universal_atfoptions;
    window.rare_atfoptions = npcData.rare_atfoptions;
    window.archer_atfoptions = npcData.archer_atfoptions;
    window.bard_atfoptions = npcData.bard_atfoptions;
    window.berserker_atfoptions = npcData.berserker_atfoptions;
    window.cleric_atfoptions = npcData.cleric_atfoptions;
    window.occultist_atfoptions = npcData.occultist_atfoptions;
    window.paladin_atfoptions = npcData.paladin_atfoptions;
    window.pugilist_atfoptions = npcData.pugilist_atfoptions;
    window.shaman_atfoptions = npcData.shaman_atfoptions;
    window.soldier_atfoptions = npcData.soldier_atfoptions;
    window.sorcerer_atfoptions = npcData.sorcerer_atfoptions;
    window.thief_atfoptions = npcData.thief_atfoptions;
    window.wanderer_atfoptions = npcData.wanderer_atfoptions;
    window.wizard_atfoptions = npcData.wizard_atfoptions;

    console.log("Data has been assigned to global variables.");
  }
}

// Initialize the generator when the page loads
window.onload = async function () {
  await initializeGenerator();

  // NPC Generation logic
  document
    .getElementById("generate-button")
    .addEventListener("click", async () => {
      const level = document.getElementById("level-input").value;
      const archetype = document.getElementById("archetype-input").value;
      const isSpellcaster = document.getElementById(
        "spellcaster-checkbox"
      ).checked;
      const includeUniversal =
        document.getElementById("universal-checkbox").checked;
      const includeRare = document.getElementById("rare-checkbox").checked;
      const difficulty = document
        .querySelector(".difficulty-buttons .selected")
        .id.replace("-button", "");

      // Call the NPC generation function
      const npcData = generateNPC(
        level,
        archetype,
        difficulty,
        isSpellcaster,
        includeUniversal,
        includeRare
      );

      try {
        // Convert Markdown to HTML and display it
        document.getElementById("npc-display").innerHTML =
          marked.parse(npcData);
      } catch (error) {
        console.error("Error converting Markdown to HTML:", error);
      }
    });
};
