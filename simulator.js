document.addEventListener('DOMContentLoaded', () => {
    const SKILL_COSTS = [1,2,3,4,5,6,7,8,9,10];
    const POINTS_PER_LEVEL = 4;

    const SKILLS = {
        attack:          { name: 'Attack', icon: '⚔️', values: [100,120,140,160,180,200,220,240,260,280,300] },
        precision:       { name: 'Precision', icon: '🎯', values: [50,55,60,65,70,75,80,85,90,95,100] },
        critChance:      { name: 'Crit Chance', icon: '💥', values: [10,15,20,25,30,35,40,45,50,55,60] },
        critDamage:      { name: 'Crit Damage', icon: '🔥', values: [100,120,140,160,180,200,220,240,260, 280,300] },
        armor:           { name: 'Armor', icon: '🛡️', values: [0,4,8,12,16,20,24,28,32,36,40] },
        dodge:           { name: 'Dodge', icon: '💨', values: [0,4,8,12,16,20,24,28,32,36,40] },
        // POPRAWKA: Loot Chance 5% -> 15%
        lootChance:      { name: 'Loot Chance', icon: '📦', values: [5,6,7,8,9,10,11,12,13,14,15] },
        health:          { name: 'Health', icon: '❤️', values: [50,60,70,80,90,100,110,120,130,140,150] },
        hunger:          { name: 'Hunger', icon: '🍖', values: [4,5,6,7,8,9,10,11,12,13,14] },
        energy:          { name: 'Energy', icon: '⚡', values: [30,40,50,60,70,80,90,100,110,120,130] },
        entrepreneurship:{ name: 'Entrepreneurship', icon: '💼', values: [30,35,40,45,50,55,60,65,70,75,80] },
        production:      { name: 'Production', icon: '⚙️', values: [10,13,16,19,22,25,28,31,34,37,40] },
        companies:       { name: 'Companies', icon: '🏢', values: [2,3,4,5,6,7,8,9,10,11,12] }
    };

    let currentBuild = {};
    
    initApp();

    function initApp() {
        renderSkills();
        
        // Listeners
        document.getElementById('playerLevel').addEventListener('input', handleLevelChange);
        document.getElementById('totalPoints').addEventListener('input', () => { updateTracker(); saveAll(); });
        document.getElementById('resetSkillsBtn').addEventListener('click', resetSkills);
        
        const allInputs = document.querySelectorAll('input, select');
        allInputs.forEach(el => {
            if(el.id === 'playerLevel' || el.id === 'totalPoints') return;
            el.addEventListener('input', () => { simulate(); saveAll(); });
        });

        loadFromStorage();
    }

    function handleLevelChange(e) {
        const lvl = parseInt(e.target.value) || 1;
        const points = lvl * POINTS_PER_LEVEL;
        document.getElementById('totalPoints').value = points;
        updateTracker();
        saveAll();
        simulate();
    }

    function resetSkills() {
        if(confirm('Zresetować build?')) {
            Object.keys(SKILLS).forEach(key => {
                currentBuild[key] = 0;
                document.getElementById(`slider_${key}`).value = 0;
                document.getElementById(`input_${key}`).value = 0;
                updateSkillDisplay(key, 0);
            });
            updateTracker();
            saveAll();
            simulate();
        }
    }

    function renderSkills() {
        const grid = document.getElementById('skillsGrid');
        grid.innerHTML = ''; // Clear on re-render if needed
        Object.keys(SKILLS).forEach(key => {
            currentBuild[key] = 0;
            const skill = SKILLS[key];
            const el = document.createElement('div');
            el.className = 'skill-item';
            el.innerHTML = `
                <div class="skill-header">
                    <span>${skill.icon} ${skill.name}</span>
                    <span class="skill-val-display" id="val_${key}">${skill.values[0]}${getSuffix(key)}</span>
                </div>
                <div class="skill-controls">
                    <input type="range" id="slider_${key}" min="0" max="10" value="0">
                    <input type="number" id="input_${key}" min="0" max="10" value="0">
                </div>
            `;
            grid.appendChild(el);
            
            const slider = document.getElementById(`slider_${key}`);
            const input = document.getElementById(`input_${key}`);

            const update = (val) => {
                val = Math.max(0, Math.min(10, parseInt(val)||0));
                slider.value = val;
                input.value = val;
                currentBuild[key] = val;
                updateSkillDisplay(key, val);
                updateTracker();
                saveAll();
                simulate();
            };

            slider.addEventListener('input', e => update(e.target.value));
            input.addEventListener('input', e => update(e.target.value));
        });
    }

    function updateSkillDisplay(key, val) {
        document.getElementById(`val_${key}`).textContent = SKILLS[key].values[val] + getSuffix(key);
    }

    function getSuffix(key) {
        return ['precision','critChance','critDamage','armor','dodge','lootChance'].includes(key) ? '%' : '';
    }

    function updateTracker() {
        const total = parseInt(document.getElementById('totalPoints').value) || 0;
        let spent = 0;
        Object.values(currentBuild).forEach(lvl => {
            if(lvl > 0) spent += SKILL_COSTS.slice(0, lvl).reduce((a,b)=>a+b, 0);
        });
        document.getElementById('usedPoints').textContent = spent;
        const warn = document.getElementById('pointsWarning');
        if(spent > total) {
            document.getElementById('usedPoints').style.color = '#ff5555';
            warn.style.display = 'block';
        } else {
            document.getElementById('usedPoints').style.color = '#ff3333';
            warn.style.display = 'none';
        }
    }

    // --- SIMULATION ---
    function simulate() {
        const eq = getInputs();
        
        const stats = {
            attack: (SKILLS.attack.values[currentBuild.attack] + eq.weaponAttack) * (1 + eq.ammoBonus/100),
            precision: Math.min(100, SKILLS.precision.values[currentBuild.precision] + eq.glovesPrec),
            critChance: Math.min(100, SKILLS.critChance.values[currentBuild.critChance] + eq.weaponCrit),
            critDamage: SKILLS.critDamage.values[currentBuild.critDamage] + eq.helmetCritDmg,
            armor: Math.min(90, SKILLS.armor.values[currentBuild.armor] + eq.chestArmor + eq.pantsArmor),
            dodge: Math.min(75, SKILLS.dodge.values[currentBuild.dodge] + eq.bootsDodge),
            lootChance: SKILLS.lootChance.values[currentBuild.lootChance],
            maxHealth: SKILLS.health.values[currentBuild.health],
            maxHunger: SKILLS.hunger.values[currentBuild.hunger],
            energy: SKILLS.energy.values[currentBuild.energy],
            entrepreneurship: SKILLS.entrepreneurship.values[currentBuild.entrepreneurship],
            production: SKILLS.production.values[currentBuild.production]
        };

        // Base Combat
        const normalDmg = stats.attack;
        const critDmg = stats.attack * (1 + stats.critDamage/100);
        const missDmg = stats.attack * 0.5;

        // Min (Miss) / Max (Crit) Base
        const baseMin = missDmg;
        const baseMax = critDmg;

        const damageWhenHit = normalDmg * (1 - stats.critChance/100) + critDmg * (stats.critChance/100);
        const avgDmgBase = damageWhenHit * (stats.precision/100) + missDmg * (1 - stats.precision/100);

        const hpCostPerHit = 10 * (1 - stats.armor/100) * (1 - stats.dodge/100);
        const totalRegenPerH = (stats.maxHealth * 0.1) + ((stats.maxHunger * 0.1) * eq.foodHP);

        let hitsBuff = 0;
        let hitsDebuff = 0;

        if (eq.usePill) {
            const startPool = stats.maxHealth + (stats.maxHunger * eq.foodHP);
            const buffPool = startPool + (totalRegenPerH * 8);
            const debuffPool = totalRegenPerH * 16;
            
            if (hpCostPerHit > 0) {
                hitsBuff = buffPool / hpCostPerHit;
                hitsDebuff = debuffPool / hpCostPerHit;
            }
        } else {
            const startPool = stats.maxHealth + (stats.maxHunger * eq.foodHP);
            const dailyRegen = totalRegenPerH * 24;
            if (hpCostPerHit > 0) {
                hitsDebuff = (startPool + dailyRegen) / hpCostPerHit;
            }
        }

        const totalHits24h = hitsBuff + hitsDebuff;
        let totalDmg24h = 0;
        let avgHitWeighted = 0;

        // === MIN / MAX LOGIC WITH PILL ===
        let pillMin = 0, pillMax = 0;
        let noPillMin = 0, noPillMax = 0;
        let labelBuff = "Min-Max";
        let labelDebuff = "Min-Max";

        if (eq.usePill) {
            // Buff Phase (1.8x)
            pillMin = baseMin * 1.8;
            pillMax = baseMax * 1.8;
            
            // Debuff Phase (0.2x)
            noPillMin = baseMin * 0.2;
            noPillMax = baseMax * 0.2;

            totalDmg24h = (hitsBuff * avgDmgBase * 1.8) + (hitsDebuff * avgDmgBase * 0.2);
            avgHitWeighted = totalHits24h > 0 ? totalDmg24h / totalHits24h : 0;
            
            labelBuff = "Min-Max (BUFF 1.8x)";
            labelDebuff = "Min-Max (DEBUFF 0.2x)";
        } else {
            // No Pill (1.0x)
            pillMin = baseMin; // Treat as standard
            pillMax = baseMax;
            
            noPillMin = baseMin;
            noPillMax = baseMax;

            totalDmg24h = totalHits24h * avgDmgBase;
            avgHitWeighted = avgDmgBase;
            
            labelBuff = "Min-Max (Normal)";
            labelDebuff = "Min-Max (Normal)";
        }

        const equipUsed24h = totalHits24h / 100;

        // Production
        const selfPP = ((stats.entrepreneurship * 0.1 * 24)/10) * stats.production * (1 + eq.prodBonus/100);
        const extPP = eq.worksPerDay * stats.production * (1 + eq.prodBonus/100);
        const autoPP = eq.engineLvl * 24 * eq.numCompanies * (1 + eq.prodBonus/100);
        const totalPP24h = selfPP + extPP + autoPP;

        // DISPLAY
        const fmt = (val) => `<b>${formatK(val)}</b> <i>${formatK(val*7)}</i>`;
        const fmtRange = (min, max) => `<b>${Math.round(min)}</b> - <b>${Math.round(max)}</b>`;

        document.getElementById('resTotalDmg').innerHTML = fmt(totalDmg24h);
        document.getElementById('resAvgDmg').textContent = Math.round(avgHitWeighted);
        document.getElementById('resHits').innerHTML = fmt(totalHits24h);
        
        // Update Labels and Values for Min/Max
        document.querySelector('#cardMinMaxBuff small').textContent = labelBuff;
        document.getElementById('resMinMaxBuff').innerHTML = fmtRange(pillMin, pillMax);

        document.querySelector('#cardMinMaxDebuff small').textContent = labelDebuff;
        document.getElementById('resMinMaxDebuff').innerHTML = fmtRange(noPillMin, noPillMax);
        
        if(!eq.usePill) {
             document.getElementById('cardMinMaxDebuff').style.display = 'none'; // Hide duplicate info if no pill
        } else {
             document.getElementById('cardMinMaxDebuff').style.display = 'block';
        }

        document.getElementById('resCases').innerHTML = fmt(totalHits24h * stats.lootChance / 100);
        document.getElementById('resHpCost').textContent = hpCostPerHit.toFixed(2);
        document.getElementById('resEquipUsed').innerHTML = fmt(equipUsed24h);
        document.getElementById('resTotalPP').innerHTML = fmt(totalPP24h);

        document.getElementById('fbTotalDmg').textContent = formatK(totalDmg24h);
        document.getElementById('fbTotalHits').textContent = formatK(totalHits24h);
        document.getElementById('fbAvgHit').textContent = Math.round(avgHitWeighted);

        // JSON prep
        const json = {
            version: "7.0",
            level: document.getElementById('playerLevel').value,
            totalPoints: document.getElementById('totalPoints').value,
            build: currentBuild,
            inputs: eq
        };
        document.getElementById('jsonOutput').value = JSON.stringify(json);
    }

    // --- STORAGE & IMPORT ---
    function saveAll() {
        const jsonStr = document.getElementById('jsonOutput').value;
        if(jsonStr) localStorage.setItem('warEraSave_v7', jsonStr);
    }

    function loadFromStorage() {
        const saved = localStorage.getItem('warEraSave_v7');
        if (saved) {
            importDataLogic(saved);
        } else {
            simulate();
        }
    }

    window.importJSON = function() {
        const str = document.getElementById('jsonOutput').value;
        if(!str) return alert("Wklej JSON do pola tekstowego!");
        try {
            importDataLogic(str);
            alert("Wczytano pomyślnie!");
        } catch(e) {
            alert("Błąd importu: " + e.message);
        }
    };

    function importDataLogic(jsonString) {
        const data = JSON.parse(jsonString);
        
        if(data.level) document.getElementById('playerLevel').value = data.level;
        if(data.totalPoints) document.getElementById('totalPoints').value = data.totalPoints;

        if(data.inputs) {
            const map = {
                weaponAttack: data.inputs.weaponAttack,
                weaponCrit: data.inputs.weaponCrit,
                helmetCritDmg: data.inputs.helmetCritDmg,
                chestArmor: data.inputs.chestArmor,
                pantsArmor: data.inputs.pantsArmor,
                bootsDodge: data.inputs.bootsDodge,
                glovesPrec: data.inputs.glovesPrec,
                foodType: data.inputs.foodHP,
                ammoType: data.inputs.ammoBonus,
                numCompanies: data.inputs.numCompanies,
                automatedEngine: data.inputs.engineLvl,
                productionBonus: data.inputs.prodBonus,
                worksPerDay: data.inputs.worksPerDay
            };
            Object.keys(map).forEach(id => {
                if(document.getElementById(id)) document.getElementById(id).value = map[id];
            });
            document.getElementById('usePill').checked = data.inputs.usePill;
        }

        if(data.build) {
            Object.keys(data.build).forEach(key => {
                const val = data.build[key];
                if(document.getElementById(`slider_${key}`)) {
                    document.getElementById(`slider_${key}`).value = val;
                    document.getElementById(`input_${key}`).value = val;
                    currentBuild[key] = val;
                    updateSkillDisplay(key, val);
                }
            });
        }
        updateTracker();
        simulate();
    }

    function updateSkillDisplay(key, val) {
        document.getElementById(`val_${key}`).textContent = SKILLS[key].values[val] + getSuffix(key);
    }

    function updateTracker() {
        const total = parseInt(document.getElementById('totalPoints').value) || 0;
        let spent = 0;
        Object.values(currentBuild).forEach(lvl => {
            if(lvl > 0) spent += SKILL_COSTS.slice(0, lvl).reduce((a,b)=>a+b, 0);
        });
        document.getElementById('usedPoints').textContent = spent;
        const warn = document.getElementById('pointsWarning');
        if(spent > total) {
            document.getElementById('usedPoints').style.color = '#ff5555';
            warn.style.display = 'block';
        } else {
            document.getElementById('usedPoints').style.color = '#ff3333';
            warn.style.display = 'none';
        }
    }

    function formatK(num) {
        if (num >= 1000000) return (num/1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num/1000).toFixed(1) + 'k';
        return Math.round(num);
    }

    function getInputs() {
        return {
            weaponAttack: parseFloat(document.getElementById('weaponAttack').value)||0,
            weaponCrit: parseFloat(document.getElementById('weaponCrit').value)||0,
            helmetCritDmg: parseFloat(document.getElementById('helmetCritDmg').value)||0,
            chestArmor: parseFloat(document.getElementById('chestArmor').value)||0,
            pantsArmor: parseFloat(document.getElementById('pantsArmor').value)||0,
            bootsDodge: parseFloat(document.getElementById('bootsDodge').value)||0,
            glovesPrec: parseFloat(document.getElementById('glovesPrec').value)||0,
            foodHP: parseInt(document.getElementById('foodType').value)||0,
            ammoBonus: parseInt(document.getElementById('ammoType').value)||0,
            usePill: document.getElementById('usePill').checked,
            numCompanies: parseInt(document.getElementById('numCompanies').value)||0,
            engineLvl: parseInt(document.getElementById('automatedEngine').value)||0,
            prodBonus: parseInt(document.getElementById('productionBonus').value)||0,
            worksPerDay: parseInt(document.getElementById('worksPerDay').value)||0
        };
    }
});

function copyJSON() {
    const el = document.getElementById('jsonOutput');
    el.select();
    navigator.clipboard.writeText(el.value);
    alert('Skopiowano!');
}