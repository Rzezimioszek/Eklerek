document.addEventListener('DOMContentLoaded', () => {
    // Koszty umiejętności (Level 0->1 to index 0 itd.)
    const SKILL_COSTS = [1,2,3,4,5,6,7,8,9,10];
    
    // DANE Z WIKI (Zweryfikowane)
    const SKILLS = {
        attack:          { name: 'Attack', icon: '⚔️', values: [100,120,140,160,180,200,220,240,260,280,300] },
        precision:       { name: 'Precision', icon: '🎯', values: [50,55,60,65,70,75,80,85,90,95,100] },
        critChance:      { name: 'Crit Chance', icon: '💥', values: [10,15,20,25,30,35,40,45,50,55,60] },
        critDamage:      { name: 'Crit Damage', icon: '🔥', values: [50,60,70,80,90,100,110,120,130,140,150] },
        armor:           { name: 'Armor', icon: '🛡️', values: [0,4,8,12,16,20,24,28,32,36,40] },
        dodge:           { name: 'Dodge', icon: '💨', values: [0,4,8,12,16,20,24,28,32,36,40] },
        lootChance:      { name: 'Loot Chance', icon: '📦', values: [5,10,15,20,25,30,35,40,45,50,55] }, // Start od 5%
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
        updateTracker();
        
        document.getElementById('totalPoints').addEventListener('input', updateTracker);
        document.getElementById('simulateBtn').addEventListener('click', simulate);
    }

    function renderSkills() {
        const grid = document.getElementById('skillsGrid');
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

            // Event Listeners
            const slider = document.getElementById(`slider_${key}`);
            const input = document.getElementById(`input_${key}`);
            const display = document.getElementById(`val_${key}`);

            const update = (val) => {
                val = Math.max(0, Math.min(10, parseInt(val)||0));
                slider.value = val;
                input.value = val;
                currentBuild[key] = val;
                display.textContent = skill.values[val] + getSuffix(key);
                updateTracker();
            };

            slider.addEventListener('input', e => update(e.target.value));
            input.addEventListener('input', e => update(e.target.value));
        });
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

        const usedEl = document.getElementById('usedPoints');
        usedEl.textContent = spent;
        
        const warn = document.getElementById('pointsWarning');
        if(spent > total) {
            usedEl.style.color = '#ff5555';
            warn.style.display = 'block';
        } else {
            usedEl.style.color = '#00ff9d';
            warn.style.display = 'none';
        }
    }

    function simulate() {
        const eq = getInputs();
        
        // 1. BAZOWE STATY
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

        // 2. COMBAT MATH
        // Crit Logic: Wiki says "Crit hit = Base + (CritDmg% * Base)" -> Base * (1 + CritDmg)
        const normalDmg = stats.attack;
        const critDmg = stats.attack * (1 + stats.critDamage/100);
        const missDmg = stats.attack * 0.5;

        // Avg Hit Dmg: (Hit% * (Normal/Crit Mix)) + (Miss% * MissDmg)
        // Crit chance applies on hit.
        const damageWhenHit = normalDmg * (1 - stats.critChance/100) + critDmg * (stats.critChance/100);
        const avgDmgPerHit = damageWhenHit * (stats.precision/100) + missDmg * (1 - stats.precision/100);

        // Sustainability
        // Cost = 10 * (1-Armor) * (1-Dodge). Dodge completely avoids dmg.
        const hpCostPerHit = 10 * (1 - stats.armor/100) * (1 - stats.dodge/100);
        
        // Regen (Wiki: 10% per hour)
        const naturalRegen = stats.maxHealth * 0.1 * 24;
        const foodRegen = stats.maxHunger * 0.1 * 24 * eq.foodHP;
        const totalHpRegen = naturalRegen + foodRegen;

        const hitsPerDay = hpCostPerHit > 0 ? totalHpRegen / hpCostPerHit : 0;

        // Total Damage (Pill Logic)
        let totalDmg = 0;
        if(eq.usePill) {
            // 8h buff (+80%), 16h debuff (-80%)
            const hitsPerH = hitsPerDay / 24;
            totalDmg = (hitsPerH * 8 * avgDmgPerHit * 1.8) + (hitsPerH * 16 * avgDmgPerHit * 0.2);
        } else {
            totalDmg = hitsPerDay * avgDmgPerHit;
        }

        // 3. PRODUCTION MATH
        const sessionsSelf = (stats.entrepreneurship * 0.1 * 24) / 10;
        const selfPP = sessionsSelf * stats.production * (1 + eq.prodBonus/100);
        
        const extPP = eq.worksPerDay * stats.production * (1 + eq.prodBonus/100);
        
        const autoPP = eq.engineLvl * 24 * eq.numCompanies * (1 + eq.prodBonus/100);
        
        const totalPP = selfPP + extPP + autoPP;

        // 4. DISPLAY
        document.getElementById('resAvgDmg').textContent = avgDmgPerHit.toFixed(1);
        document.getElementById('resHits').textContent = Math.round(hitsPerDay).toLocaleString();
        document.getElementById('resTotalDmg').textContent = Math.round(totalDmg).toLocaleString();
        document.getElementById('resCases').textContent = (hitsPerDay * stats.lootChance / 100).toFixed(1);
        document.getElementById('resHpCost').textContent = hpCostPerHit.toFixed(2);
        document.getElementById('resHpRegen').textContent = Math.round(totalHpRegen);

        document.getElementById('resSelfPP').textContent = Math.round(selfPP);
        document.getElementById('resExtPP').textContent = Math.round(extPP);
        document.getElementById('resAutoPP').textContent = Math.round(autoPP);
        document.getElementById('resTotalPP').textContent = Math.round(totalPP).toLocaleString();

        document.getElementById('results').style.display = 'block';
        document.getElementById('results').scrollIntoView({behavior:'smooth'});

        // Prepare JSON for copy
        const exportData = {
            build: currentBuild,
            inputs: eq,
            results: { avgDmgPerHit, hitsPerDay, totalDmg, totalPP }
        };
        document.getElementById('jsonOutput').value = JSON.stringify(exportData, null, 2);
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
    alert('Skopiowano JSON!');
}