import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PeriodicTable.css';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const elementData = {
    "H": { n: 1, name: "Hydrogen", cat: "nonmetal", x: 1, y: 1, mass: "1.008", config: "1s¹", fact: "The most abundant element in the universe!", period: 1, summary: "Hydrogen is the lightest element. Hydrogen is a gas at normal temperature and pressure, but hydrogen condenses to a liquid at minus 253 degrees Celsius. Hydrogen is the simplest element. Each atom of hydrogen has only one proton." },
    "He": { n: 2, name: "Helium", cat: "noble-gas", x: 18, y: 1, mass: "4.002", config: "1s²", fact: "Inhaling helium makes your voice sound higher-pitched!", period: 1, summary: "Helium is a colorless, odorless, non-toxic noble gas with the lowest boiling point of any element, primarily sourced as a byproduct of natural gas extraction. Indispensable for MRI scanners, semiconductor manufacturing, and aerospace, it is also used in welding and diving mixtures. Discovered in 1868, it is the second most abundant element, largely found underground." },
    "Li": { n: 3, name: "Lithium", cat: "alkali-metal", x: 1, y: 2, mass: "6.94", config: "[He] 2s¹", fact: "Lithium is the lightest metal.", period: 2, summary: "Lithium is a soft and very light metal that reacts easily with water. It is widely used in rechargeable batteries for phones, laptops, and electric cars. It is also used in some medicines for mental health treatment. Lithium must be stored carefully because it is reactive. It was discovered in 1817." },
    "Be": { n: 4, name: "Beryllium", cat: "alkaline-earth", x: 2, y: 2, mass: "9.012", config: "[He] 2s²", fact: "Beryllium tastes sweet, but don't eat it—it's highly toxic!", period: 2, summary: "Beryllium is a strong but lightweight metal used in aerospace and high-tech equipment. It is resistant to heat and does not easily bend. Because of its properties, it is used in satellites and aircraft parts. However, it can be toxic if inhaled as dust. It was discovered in 1798." },
    "B": { n: 5, name: "Boron", cat: "metalloid", x: 13, y: 2, mass: "10.81", config: "[He] 2s² 2p¹", fact: "Boron is used in fiberglass.", period: 2, summary: "Boron is a hard element often used in glass, ceramics, and cleaning products. It helps make materials stronger and more heat-resistant. It is also important for plant growth in small amounts. Boron is used in semiconductors and electronics as well. It was discovered in 1808." },
    "C": { n: 6, name: "Carbon", cat: "nonmetal", x: 14, y: 2, mass: "12.011", config: "[He] 2s² 2p²", fact: "Carbon can take the form of soft pencil lead or a super-hard diamond!", period: 2, summary: "Carbon is one of the most important elements for life. It forms the structure of all living organisms and is found in DNA, proteins, and food. It exists in different forms like diamond, graphite, and coal. Carbon is also used in fuels and many materials. It has been known since ancient times." },
    "N": { n: 7, name: "Nitrogen", cat: "nonmetal", x: 15, y: 2, mass: "14.007", config: "[He] 2s² 2p³", fact: "Nitrogen makes up 78% of Earth's air.", period: 2, summary: "Nitrogen is a gas that makes up about 78% of the Earth’s atmosphere. It is essential for plants because it helps form proteins and DNA. Nitrogen is used in fertilizers to improve crop growth. It is also used in liquid form for freezing and preserving materials. It was discovered in 1772." },
    "O": { n: 8, name: "Oxygen", cat: "nonmetal", x: 16, y: 2, mass: "15.999", config: "[He] 2s² 2p⁴", fact: "Oxygen is highly reactive.", period: 2, summary: "Oxygen is a gas that is necessary for most living organisms to breathe. It supports combustion, meaning things burn more easily in its presence. It is widely used in medicine, especially for patients who need help breathing. Oxygen is also used in industries like steel production. It was discovered in 1774." },
    "F": { n: 9, name: "Fluorine", cat: "nonmetal", x: 17, y: 2, mass: "18.998", config: "[He] 2s² 2p⁵", fact: "Fluorine is added to your toothpaste to help protect your teeth from cavities!", period: 2, summary: "Fluorine is a very reactive gas and one of the most reactive elements. It is used in toothpaste to help prevent tooth decay. It is also used in making chemicals like Teflon. Because it is very reactive, it must be handled carefully. It was discovered in 1886." },
    "Ne": { n: 10, name: "Neon", cat: "noble-gas", x: 18, y: 2, mass: "20.180", config: "[He] 2s² 2p⁶", fact: "Neon is used in bright advertising signs.", period: 2, summary: "Neon is a noble gas that does not react easily with other elements. It glows brightly when electricity passes through it, which is why it is used in neon signs. It is also used in lighting and advertising. Neon is rare in the atmosphere. It was discovered in 1898." },
    "Na": { n: 11, name: "Sodium", cat: "alkali-metal", x: 1, y: 3, mass: "22.990", config: "[Ne] 3s¹", fact: "Sodium is a metal so soft you can cut it with a butter knife, and it explodes in water!", period: 3, summary: "Sodium is a soft metal that reacts strongly with water. It is commonly found in table salt when combined with chlorine. Sodium is important for nerve signals and fluid balance in the body. It must be stored in oil because it reacts quickly with air and water. It was discovered in 1807." },
    "Mg": { n: 12, name: "Magnesium", cat: "alkaline-earth", x: 2, y: 3, mass: "24.305", config: "[Ne] 3s²", fact: "Magnesium is used in flares and pyrotechnics.", period: 3, summary: "Magnesium is a light metal that burns with a bright white flame. It is used in fireworks, flares, and lightweight alloys. It is also important for human health, especially for muscles and bones. Magnesium is found in many foods like nuts and vegetables. It was discovered in 1755." },
    "Al": { n: 13, name: "Aluminium", cat: "post-transition", x: 13, y: 3, mass: "26.982", config: "[Ne] 3s² 3p¹", fact: "Aluminum is the most abundant metal in Earth's crust.", period: 3, summary: "Aluminum is a lightweight and corrosion-resistant metal. It is widely used in packaging, transportation, and construction. It does not rust easily, making it very useful. Aluminum is also recyclable and environmentally friendly. It was discovered in 1825." },
    "Si": { n: 14, name: "Silicon", cat: "metalloid", x: 14, y: 3, mass: "28.085", config: "[Ne] 3s² 3p²", fact: "Silicon is a key component in computer chips.", period: 3, summary: "Silicon is a very important element in technology. It is used to make computer chips and electronic devices. It is also found in sand and glass. Silicon helps in making solar panels for energy. It was discovered in 1824." },
    "P": { n: 15, name: "Phosphorus", cat: "nonmetal", x: 15, y: 3, mass: "30.974", config: "[Ne] 3s² 3p³", fact: "Phosphorus is essential for life.", period: 3, summary: "Phosphorus is an element that can glow in the dark. It is used in fertilizers to help plants grow. It is also found in DNA and is important for life. Some forms of phosphorus are very reactive and must be handled carefully. It was discovered in 1669." },
    "S": { n: 16, name: "Sulfur", cat: "nonmetal", x: 16, y: 3, mass: "32.06", config: "[Ne] 3s² 3p⁴", fact: "Sulfur is used in gunpowder and matches.", period: 3, summary: "Sulfur is a yellow solid that has been known since ancient times. It is used in making chemicals like sulfuric acid. It is also used in rubber and medicines. Sulfur has a strong smell when burned. It has been known since ancient times." },
    "Cl": { n: 17, name: "Chlorine", cat: "nonmetal", x: 17, y: 3, mass: "35.45", config: "[Ne] 3s² 3p⁵", fact: "Chlorine is used to disinfect water.", period: 3, summary: "Chlorine is a greenish gas with a strong smell. It is used to disinfect water and keep swimming pools clean. It is also used in making plastics like PVC. Chlorine can be harmful if inhaled in large amounts. It was discovered in 1774." },
    "Ar": { n: 18, name: "Argon", cat: "noble-gas", x: 18, y: 3, mass: "39.948", config: "[Ne] 3s² 3p⁶", fact: "Argon is used in incandescent light bulbs.", period: 3, summary: "Argon is a noble gas that is very stable and does not react easily. It is used in light bulbs to protect the filament. It is also used in welding and industrial processes. Argon makes up a small part of the air. It was discovered in 1894." },
    "K": { n: 19, name: "Potassium", cat: "alkali-metal", x: 1, y: 4, mass: "39.098", config: "[Ar] 4s¹", fact: "Potassium is vital for cell function.", period: 4, summary: "Potassium is a soft and reactive metal. It is important for the proper function of muscles and nerves. It is found in foods like bananas and vegetables. Potassium reacts strongly with water and must be stored carefully. It was discovered in 1807." },
    "Ca": { n: 20, name: "Calcium", cat: "alkaline-earth", x: 2, y: 4, mass: "40.078", config: "[Ar] 4s²", fact: "Calcium is necessary for strong bones.", period: 4, summary: "Calcium is a metal that is very important for bones and teeth. It is also needed for muscle movement and nerve signals. Calcium is found in milk and other dairy products. It is also used in construction materials like cement. It was discovered in 1808." },
    "Sc": { n: 21, name: "Scandium", cat: "transition-metal", x: 3, y: 4, mass: "44.956", config: "[Ar] 3d¹ 4s²", fact: "Used in aerospace components.", period: 4, summary: "Scandium is a rare metal that is lightweight and strong. It is often used in aluminum alloys to make sports equipment and aircraft parts stronger. It is not commonly found in pure form in nature. Scandium is also used in some high-intensity lights. It was discovered in 1879." },
    "Ti": { n: 22, name: "Titanium", cat: "transition-metal", x: 4, y: 4, mass: "47.867", config: "[Ar] 3d² 4s²", fact: "Strong as steel, but much lighter.", period: 4, summary: "Titanium is a very strong and lightweight metal that is resistant to corrosion. It is widely used in aircraft, medical implants, and even jewelry. It does not easily react with water or air. Because of its strength, it is also used in military equipment. It was discovered in 1791." },
    "V": { n: 23, name: "Vanadium", cat: "transition-metal", x: 5, y: 4, mass: "50.942", config: "[Ar] 3d³ 4s²", fact: "Used to make shock-resistant steel.", period: 4, summary: "Vanadium is a metal often added to steel to make it stronger and more durable. It is used in tools, construction materials, and car parts. It can also store energy in special batteries. Vanadium compounds can have different colors. It was discovered in 1801." }, 
    "Cr": { n: 24, name: "Chromium", cat: "transition-metal", x: 6, y: 4, mass: "51.996", config: "[Ar] 3d⁵ 4s¹", fact: "Gives rubies their red color.", period: 4, summary: "Chromium is a shiny metal used for plating and making stainless steel. It helps prevent rust and corrosion. It is also used in dyes and pigments. Chromium gives a mirror-like finish to surfaces. It was discovered in 1797." },
    "Mn": { n: 25, name: "Manganese", cat: "transition-metal", x: 7, y: 4, mass: "54.938", config: "[Ar] 3d⁵ 4s²", fact: "Essential for photosynthesis in plants.", period: 4, summary: "Manganese is a metal used mainly in steel production. It helps improve strength and resistance to wear. It is also important for human health in small amounts. Manganese is found in minerals and rocks. It was discovered in 1774." },
    "Fe": { n: 26, name: "Iron", cat: "transition-metal", x: 8, y: 4, mass: "55.845", config: "[Ar] 3d⁶ 4s²", fact: "The most abundant element by mass on Earth.", period: 4, summary: "Iron is one of the most commonly used metals in the world. It is used to make steel for buildings, vehicles, and tools. It is also essential in the human body for carrying oxygen in the blood. Iron rusts when exposed to air and water. It has been known since ancient times." },
    "Co": { n: 27, name: "Cobalt", cat: "transition-metal", x: 9, y: 4, mass: "58.933", config: "[Ar] 3d⁷ 4s²", fact: "Used to create strong magnets.", period: 4, summary: "Cobalt is a metal used in batteries, magnets, and blue pigments. It is important in rechargeable battery technology. It is also used in medical treatments and radiation therapy. Cobalt compounds often have a bright blue color. It was discovered in 1735." },
    "Ni": { n: 28, name: "Nickel", cat: "transition-metal", x: 10, y: 4, mass: "58.693", config: "[Ar] 3d⁸ 4s²", fact: "Used in coins and stainless steel.", period: 4, summary: "Nickel is a metal that resists corrosion and is used in coins and stainless steel. It is also important in making batteries. Nickel is strong and can handle high temperatures. It is often mixed with other metals to improve their properties. It was discovered in 1751." },
    "Cu": { n: 29, name: "Copper", cat: "transition-metal", x: 11, y: 4, mass: "63.546", config: "[Ar] 3d¹⁰ 4s¹", fact: "One of the best conductors of electricity.", period: 4, summary: "Copper is a reddish metal that is an excellent conductor of electricity. It is widely used in electrical wiring and electronics. It has been used by humans for thousands of years. Copper can also be found in coins and plumbing. It has been known since ancient times." },
    "Zn": { n: 30, name: "Zinc", cat: "transition-metal", x: 12, y: 4, mass: "65.38", config: "[Ar] 3d¹⁰ 4s²", fact: "Used to galvanize steel to prevent rust.", period: 4, summary: "Zinc is a metal used to coat iron and steel to prevent rusting. It is also important for the immune system in humans. Zinc is used in batteries and alloys like brass. It reacts moderately with acids. It was discovered in 1746." },
    "Ga": { n: 31, name: "Gallium", cat: "post-transition", x: 13, y: 4, mass: "69.723", config: "[Ar] 3d¹⁰ 4s² 4p¹", fact: "Melts in your hand!", period: 4, summary: "Gallium is a soft metal that can melt in your hand because of its low melting point. It is used in electronics and semiconductors. It is also used in thermometers and LEDs. Gallium is not found freely in nature. It was discovered in 1875." },
    "Ge": { n: 32, name: "Germanium", cat: "metalloid", x: 14, y: 4, mass: "72.63", config: "[Ar] 3d¹⁰ 4s² 4p²", fact: "Used in fiber optics.", period: 4, summary: "Germanium is a metalloid used in semiconductors and electronics. It was important in early transistor technology. It is also used in infrared optics. Germanium is somewhat rare. It was discovered in 1886." },
    "As": { n: 33, name: "Arsenic", cat: "metalloid", x: 15, y: 4, mass: "74.922", config: "[Ar] 3d¹⁰ 4s² 4p³", fact: "Historically used as a poison.", period: 4, summary: "Arsenic is a toxic element that has been known since ancient times. It has been used in pesticides and poisons. It is also used in some electronics and semiconductors. Exposure to arsenic can be dangerous. It has been known since ancient times." },
    "Se": { n: 34, name: "Selenium", cat: "nonmetal", x: 16, y: 4, mass: "78.96", config: "[Ar] 3d¹⁰ 4s² 4p⁴", fact: "Used in photocopiers.", period: 4, summary: "Selenium is a nonmetal used in electronics and glass production. It is also important in small amounts for human health. It helps protect cells from damage. Selenium can conduct electricity under certain conditions. It was discovered in 1817." },
    "Br": { n: 35, name: "Bromine", cat: "nonmetal", x: 17, y: 4, mass: "79.904", config: "[Ar] 3d¹⁰ 4s² 4p⁵", fact: "Liquid at room temperature.", period: 4, summary: "Bromine is a reddish-brown liquid at room temperature. It is used in flame retardants and water treatment. It has a strong and unpleasant smell. Bromine is one of the few liquid elements. It was discovered in 1826." },
    "Kr": { n: 36, name: "Krypton", cat: "noble-gas", x: 18, y: 4, mass: "83.798", config: "[Ar] 3d¹⁰ 4s² 4p⁶", fact: "Used in high-speed photography flashes.", period: 4, summary: "Krypton is a noble gas used in lighting and photography. It produces a bright white light when electrified. It is also used in some types of lasers. Krypton is rare in the atmosphere. It was discovered in 1898." },
    "Rb": { n: 37, name: "Rubidium", cat: "alkali-metal", x: 1, y: 5, mass: "85.468", config: "[Kr] 5s¹", fact: "Used in atomic clocks.", period: 5, summary: "Rubidium is a soft and highly reactive metal. It reacts quickly with water and air. It is used in research and atomic clocks. Rubidium must be stored carefully. It was discovered in 1861." },
    "Sr": { n: 38, name: "Strontium", cat: "alkaline-earth", x: 2, y: 5, mass: "87.62", config: "[Kr] 5s²", fact: "Gives fireworks their crimson red color.", period: 5, summary: "Strontium is a metal used in fireworks to produce a red color. It is also used in some medical applications. It reacts with air and water. Strontium compounds are often colorful. It was discovered in 1790." },
    "Y": { n: 39, name: "Yttrium", cat: "transition-metal", x: 3, y: 5, mass: "88.906", config: "[Kr] 4d¹ 5s²", fact: "Used in LEDs and phosphors.", period: 5, summary: "Yttrium is a metal used in LEDs and phosphors for screens. It is also used in superconductors and lasers. It is not found in pure form naturally. Yttrium is important in modern technology. It was discovered in 1794." },
    "Zr": { n: 40, name: "Zirconium", cat: "transition-metal", x: 4, y: 5, mass: "91.224", config: "[Kr] 4d² 5s²", fact: "Used in nuclear reactors.", period: 5, summary: "Zirconium is a strong metal resistant to corrosion. It is used in nuclear reactors because it does not absorb neutrons easily. It is also used in ceramics and jewelry. Zirconium is durable and heat-resistant. It was discovered in 1789." },
    "Nb": { n: 41, name: "Niobium", cat: "transition-metal", x: 5, y: 5, mass: "92.906", config: "[Kr] 4d⁴ 5s¹", fact: "Used in superconducting magnets.", period: 5, summary: "Niobium is a metal used to make strong steel and special alloys. It is also used in superconductors and electronics. It helps improve the strength of materials without making them heavy. Niobium does not easily corrode. It was discovered in 1801." },
    "Mo": { n: 42, name: "Molybdenum", cat: "transition-metal", x: 6, y: 5, mass: "95.95", config: "[Kr] 4d⁵ 5s¹", fact: "Essential for nitrogen fixation in plants.", period: 5, summary: "Molybdenum is a strong metal used in steel and high-temperature equipment. It helps metals resist heat and pressure. It is also used in lubricants and electronics. Molybdenum is important in many industrial processes. It was discovered in 1778." },
    "Tc": { n: 43, name: "Technetium", cat: "transition-metal", x: 7, y: 5, mass: "98", config: "[Kr] 4d⁵ 5s²", fact: "The first artificially produced element.", period: 5, summary: "Technetium is a radioactive element that does not exist naturally in large amounts. It is mainly used in medical imaging and research. It helps doctors study organs in the body. Technetium is produced artificially in laboratories. It was discovered in 1937." },
    "Ru": { n: 44, name: "Ruthenium", cat: "transition-metal", x: 8, y: 5, mass: "101.07", config: "[Kr] 4d⁷ 5s¹", fact: "Does not tarnish at room temperature.", period: 5, summary: "Ruthenium is a rare metal used in electronics and chemical reactions. It is often added to other metals to improve their strength. It is also used in some types of solar cells. Ruthenium is resistant to corrosion. It was discovered in 1844." },
    "Rh": { n: 45, name: "Rhodium", cat: "transition-metal", x: 9, y: 5, mass: "102.91", config: "[Kr] 4d⁸ 5s¹", fact: "One of the rarest and most valuable metals.", period: 5, summary: "Rhodium is a shiny metal used in catalytic converters in cars. It helps reduce harmful gases from vehicles. It is also used in jewelry because it is bright and resistant to rust. Rhodium is very rare and valuable. It was discovered in 1803." },
    "Pd": { n: 46, name: "Palladium", cat: "transition-metal", x: 10, y: 5, mass: "106.42", config: "[Kr] 4d¹⁰", fact: "Key component in catalytic converters.", period: 5, summary: "Palladium is a metal used in electronics, jewelry, and car exhaust systems. It helps reduce pollution through catalytic converters. It is also used in hydrogen storage research. Palladium is resistant to corrosion. It was discovered in 1803." },
    "Ag": { n: 47, name: "Silver", cat: "transition-metal", x: 11, y: 5, mass: "107.87", config: "[Kr] 4d¹⁰ 5s¹", fact: "Has the highest electrical conductivity.", period: 5, summary: "Silver is a shiny metal that conducts electricity very well. It is used in jewelry, electronics, and coins. It also has antibacterial properties. Silver has been used by humans for thousands of years. It has been known since ancient times." },
    "Cd": { n: 48, name: "Cadmium", cat: "transition-metal", x: 12, y: 5, mass: "112.41", config: "[Kr] 4d¹⁰ 5s²", fact: "Used in rechargeable batteries.", period: 5, summary: "Cadmium is a metal used in batteries and coatings. It helps protect other metals from corrosion. However, it can be toxic to humans and the environment. It must be handled carefully. It was discovered in 1817." },
    "In": { n: 49, name: "Indium", cat: "post-transition", x: 13, y: 5, mass: "114.82", config: "[Kr] 4d¹⁰ 5s² 5p¹", fact: "Used in touch screens.", period: 5, summary: "Indium is a soft metal used in touchscreens and LCD displays. It is also used in electronics and semiconductors. Indium is not very common in nature. It is important in modern technology. It was discovered in 1863." },
    "Sn": { n: 50, name: "Tin", cat: "post-transition", x: 14, y: 5, mass: "118.71", config: "[Kr] 4d¹⁰ 5s² 5p²", fact: "Used to coat other metals to prevent corrosion.", period: 5, summary: "Tin is a soft metal used in cans and coatings. It helps prevent corrosion in food containers. It is also used in solder for electronics. Tin has been used since ancient times. It has been known since ancient times." },
    "Sb": { n: 51, name: "Antimony", cat: "metalloid", x: 15, y: 5, mass: "121.76", config: "[Kr] 4d¹⁰ 5s² 5p³", fact: "Used in flame retardants.", period: 5, summary: "Antimony is a metalloid used in flame retardants and batteries. It is also used in alloys to make metals harder. It has been known for a long time. Antimony compounds can be toxic. It has been known since ancient times." },
    "Te": { n: 52, name: "Tellurium", cat: "metalloid", x: 16, y: 5, mass: "127.60", config: "[Kr] 4d¹⁰ 5s² 5p⁴", fact: "Used in solar panels.", period: 5, summary: "Tellurium is a rare element used in electronics and solar panels. It helps improve the efficiency of certain materials. It is also used in alloys. Tellurium is not commonly found in nature. It was discovered in 1782." },
    "I": { n: 53, name: "Iodine", cat: "nonmetal", x: 17, y: 5, mass: "126.90", config: "[Kr] 4d¹⁰ 5s² 5p⁵", fact: "Essential for thyroid function.", period: 5, summary: "Iodine is a dark solid that turns into purple vapor when heated. It is important for human health, especially the thyroid gland. It is also used in medicine and disinfectants. Iodine is found in sea water and salt. It was discovered in 1811." },
    "Xe": { n: 54, name: "Xenon", cat: "noble-gas", x: 18, y: 5, mass: "131.29", config: "[Kr] 4d¹⁰ 5s² 5p⁶", fact: "Used in ion propulsion engines.", period: 5, summary: "Xenon is a noble gas used in special lighting and lasers. It produces bright white light. It is also used in medical imaging and space technology. Xenon is rare in the atmosphere. It was discovered in 1898." },
    "Cs": { n: 55, name: "Cesium", cat: "alkali-metal", x: 1, y: 6, mass: "132.91", config: "[Xe] 6s¹", fact: "Used in the most accurate atomic clocks.", period: 6, summary: "Cesium is a very soft and reactive metal. It is used in atomic clocks because it is very accurate. It reacts quickly with water. Cesium must be stored carefully. It was discovered in 1860." },
    "Ba": { n: 56, name: "Barium", cat: "alkaline-earth", x: 2, y: 6, mass: "137.33", config: "[Xe] 6s²", fact: "Used in medical imaging.", period: 6, summary: "Barium is a metal used in medical imaging and fireworks. It produces a green color in fireworks. It is also used in drilling fluids. Some barium compounds can be toxic. It was discovered in 1808." },
    "La": { n: 57, name: "Lanthanum", cat: "lanthanide", x: 3, y: 9, mass: "138.91", config: "[Xe] 5d¹ 6s²", fact: "The first of the Lanthanides.", period: 6, summary: "Lanthanum is a metal used in camera lenses and batteries. It helps improve the quality of glass. It is also used in lighting and electronics. Lanthanum is part of the rare earth elements. It was discovered in 1839." },
    "Ce": { n: 58, name: "Cerium", cat: "lanthanide", x: 4, y: 9, mass: "140.12", config: "[Xe] 4f¹ 5d¹ 6s²", fact: "Used in self-cleaning ovens.", period: 6, summary: "Cerium is a rare earth metal used in glass polishing and catalysts. It is also used in lighter flints. Cerium can easily react with air. It is important in modern technology. It was discovered in 1803." },
    "Pr": { n: 59, name: "Praseodymium", cat: "lanthanide", x: 5, y: 9, mass: "140.91", config: "[Xe] 4f³ 6s²", fact: "Used in aircraft engines.", period: 6, summary: "Praseodymium is a rare earth element used in magnets and glass. It gives glass a green color. It is also used in aircraft engines. Praseodymium is not commonly found alone. It was discovered in 1885." },
    "Nd": { n: 60, name: "Neodymium", cat: "lanthanide", x: 6, y: 9, mass: "144.24", config: "[Xe] 4f⁴ 6s²", fact: "Makes the strongest permanent magnets.", period: 6, summary: "Neodymium is a metal used in very strong magnets. These magnets are used in headphones, motors, and electronics. It is also used in lasers. Neodymium is very important in modern technology. It was discovered in 1885." },
    "Pm": { n: 61, name: "Promethium", cat: "lanthanide", x: 7, y: 9, mass: "145", config: "[Xe] 4f⁵ 6s²", fact: "Used in nuclear batteries.", period: 6, summary: "Promethium is a radioactive element that is very rare. It is mostly produced in nuclear reactors. It has been used in research and specialized batteries. Promethium does not occur naturally in large amounts. It was discovered in 1945." },
    "Sm": { n: 62, name: "Samarium", cat: "lanthanide", x: 8, y: 9, mass: "150.36", config: "[Xe] 4f⁶ 6s²", fact: "Used in cancer treatment drugs.", period: 6, summary: "Samarium is used in magnets and nuclear reactors. It also has applications in cancer treatment. Samarium magnets can work at high temperatures. It is part of the rare earth elements. It was discovered in 1879." },
    "Eu": { n: 63, name: "Europium", cat: "lanthanide", x: 9, y: 9, mass: "151.96", config: "[Xe] 4f⁷ 6s²", fact: "Used in anti-counterfeiting marks on Euro notes.", period: 6, summary: "Europium is used in television screens and LED lights. It helps create red and blue colors in displays. It is important for modern lighting technology. Europium is relatively rare. It was discovered in 1901." },
    "Gd": { n: 64, name: "Gadolinium", cat: "lanthanide", x: 10, y: 9, mass: "157.25", config: "[Xe] 4f⁷ 5d¹ 6s²", fact: "Used in MRI contrast agents.", period: 6, summary: "Gadolinium is used in MRI contrast agents in medicine. It helps doctors get clearer images of the body. It also has magnetic properties. Gadolinium is used in nuclear reactors as well. It was discovered in 1880." },
    "Tb": { n: 65, name: "Terbium", cat: "lanthanide", x: 11, y: 9, mass: "158.93", config: "[Xe] 4f⁹ 6s²", fact: "Used in green phosphors.", period: 6, summary: "Terbium is used in lighting and display technology. It helps produce green light in screens and lamps. It is also used in electronic devices. Terbium is one of the rare earth elements. It was discovered in 1843." },
    "Dy": { n: 66, name: "Dysprosium", cat: "lanthanide", x: 12, y: 9, mass: "162.50", config: "[Xe] 4f¹⁰ 6s²", fact: "Used in control rods for nuclear reactors.", period: 6, summary: "Dysprosium is used in magnets for electric cars and wind turbines. It helps magnets work better at high temperatures. It is also used in nuclear reactors. Dysprosium is relatively rare. It was discovered in 1886." },
    "Ho": { n: 67, name: "Holmium", cat: "lanthanide", x: 13, y: 9, mass: "164.93", config: "[Xe] 4f¹¹ 6s²", fact: "Has the highest magnetic strength of any element.", period: 6, summary: "Holmium has strong magnetic properties. It is used in lasers and nuclear control rods. It can also be used in medical technology. Holmium is part of the rare earth group. It was discovered in 1878." },
    "Er": { n: 68, name: "Erbium", cat: "lanthanide", x: 14, y: 9, mass: "167.26", config: "[Xe] 4f¹² 6s²", fact: "Used in laser surgery.", period: 6, summary: "Erbium is used in fiber optic cables and lasers. It helps improve communication technology. It can also color glass pink. Erbium is important in telecommunications. It was discovered in 1843." },
    "Tm": { n: 69, name: "Thulium", cat: "lanthanide", x: 15, y: 9, mass: "168.93", config: "[Xe] 4f¹³ 6s²", fact: "Used in portable X-ray machines.", period: 6, summary: "Thulium is one of the rarest rare earth elements. It is used in portable X-ray machines. It can also be used in lasers. Thulium is not widely used due to its rarity. It was discovered in 1879." },
    "Yb": { n: 70, name: "Ytterbium", cat: "lanthanide", x: 16, y: 9, mass: "173.05", config: "[Xe] 4f¹⁴ 6s²", fact: "Used in stainless steel.", period: 6, summary: "Ytterbium is used in atomic clocks and lasers. It is also used to improve stainless steel. This element is part of the rare earth group. Ytterbium has several useful isotopes. It was discovered in 1878." },
    "Lu": { n: 71, name: "Lutetium", cat: "lanthanide", x: 17, y: 9, mass: "174.97", config: "[Xe] 4f¹⁴ 5d¹ 6s²", fact: "Used in PET scan detectors.", period: 6, summary: "Lutetium is one of the heaviest rare earth elements. It is used in medical imaging and research. It is also used in catalysts in chemical reactions. Lutetium is quite rare. It was discovered in 1907." },
    "Hf": { n: 72, name: "Hafnium", cat: "transition-metal", x: 4, y: 6, mass: "178.49", config: "[Xe] 4f¹⁴ 5d² 6s²", fact: "Used in nuclear control rods.", period: 6, summary: "Hafnium is a metal used in nuclear reactors because it absorbs neutrons well. It is also used in electronics and high-temperature alloys. Hafnium is very resistant to corrosion. It is often found with zirconium. It was discovered in 1923." },
    "Ta": { n: 73, name: "Tantalum", cat: "transition-metal", x: 5, y: 6, mass: "180.95", config: "[Xe] 4f¹⁴ 5d³ 6s²", fact: "Used in mobile phone capacitors.", period: 6, summary: "Tantalum is a metal that resists corrosion and heat. It is used in electronics like capacitors in phones and computers. It is also used in medical implants. Tantalum is very durable. It was discovered in 1802." },
    "W": { n: 74, name: "Tungsten", cat: "transition-metal", x: 6, y: 6, mass: "183.84", config: "[Xe] 4f¹⁴ 5d⁴ 6s²", fact: "Has the highest melting point of all metals.", period: 6, summary: "Tungsten has the highest melting point of all metals. It is used in light bulb filaments and cutting tools. It is very strong at high temperatures. Tungsten is also used in military and industrial equipment. It was discovered in 1783." },
    "Re": { n: 75, name: "Rhenium", cat: "transition-metal", x: 7, y: 6, mass: "186.21", config: "[Xe] 4f¹⁴ 5d⁵ 6s²", fact: "Used in jet engines.", period: 6, summary: "Rhenium is a rare metal used in jet engines and high-temperature alloys. It can handle extreme heat and stress. It is also used in catalysts. Rhenium is one of the rarest elements in Earth’s crust. It was discovered in 1925." },
    "Os": { n: 76, name: "Osmium", cat: "transition-metal", x: 8, y: 6, mass: "190.23", config: "[Xe] 4f¹⁴ 5d⁶ 6s²", fact: "The densest natural element.", period: 6, summary: "Osmium is a very dense and hard metal. It is used in special alloys and fountain pen tips. Osmium is also very resistant to wear. It is one of the densest natural elements. It was discovered in 1803." },
    "Ir": { n: 77, name: "Iridium", cat: "transition-metal", x: 9, y: 6, mass: "192.22", config: "[Xe] 4f¹⁴ 5d⁷ 6s²", fact: "Found in meteorites; very corrosion resistant.", period: 6, summary: "Iridium is a very corrosion-resistant metal. It is used in spark plugs and high-temperature equipment. It is also found in meteorites. Iridium is extremely durable. It was discovered in 1803." },
    "Pt": { n: 78, name: "Platinum", cat: "transition-metal", x: 10, y: 6, mass: "195.08", config: "[Xe] 4f¹⁴ 5d⁹ 6s¹", fact: "Used in jewelry and lab equipment.", period: 6, summary: "Platinum is a valuable metal used in jewelry and catalytic converters. It is very resistant to corrosion and heat. It is also used in laboratory equipment. Platinum is rare and expensive. It was known since ancient times but identified in 1735." },
    "Au": { n: 79, name: "Gold", cat: "transition-metal", x: 11, y: 6, mass: "196.97", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s¹", fact: "The most malleable metal.", period: 6, summary: "Gold is a precious metal valued for jewelry and money. It does not rust or tarnish easily. It is also used in electronics and medicine. Gold has been used by humans for thousands of years. It has been known since ancient times." },
    "Hg": { n: 80, name: "Mercury", cat: "transition-metal", x: 12, y: 6, mass: "200.59", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s²", fact: "Liquid at room temperature.", period: 6, summary: "Mercury is a liquid metal at room temperature. It was once used in thermometers and scientific instruments. Mercury is toxic and must be handled carefully. It can easily evaporate into vapor. It has been known since ancient times." },
    "Tl": { n: 81, name: "Thallium", cat: "post-transition", x: 13, y: 6, mass: "204.38", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹", fact: "Highly toxic.", period: 6, summary: "Thallium is a soft and toxic metal. It has been used in electronics and research. In the past it was used in poisons and pesticides. Exposure to thallium is dangerous. It was discovered in 1861." },
    "Pb": { n: 82, name: "Lead", cat: "post-transition", x: 14, y: 6, mass: "207.2", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²", fact: "Effective at blocking radiation.", period: 6, summary: "Lead is a heavy metal used in batteries and radiation shielding. It is soft and easy to shape. However, lead is toxic to humans and the environment. Its use is now more controlled. It has been known since ancient times." },
    "Bi": { n: 83, name: "Bismuth", cat: "post-transition", x: 15, y: 6, mass: "208.98", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³", fact: "Bismuth can be grown into incredible, rainbow-colored staircase crystals!", period: 6, summary: "Bismuth is a brittle metal with colorful crystal forms. It is used in medicines and cosmetics. Bismuth is less toxic compared to similar metals. It is also used in alloys. It was discovered in 1753." },
    "Po": { n: 84, name: "Polonium", cat: "metalloid", x: 16, y: 6, mass: "209", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴", fact: "Discovered by Marie Curie.", period: 6, summary: "Polonium is a highly radioactive element. It is very rare and dangerous. It has been used in research and some industrial applications. It releases a large amount of energy. It was discovered in 1898." },
    "At": { n: 85, name: "Astatine", cat: "metalloid", x: 17, y: 6, mass: "210", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵", fact: "The rarest naturally occurring element.", period: 6, summary: "Astatine is one of the rarest elements on Earth. It is radioactive and unstable. Scientists mainly study it in laboratories. It may have uses in cancer treatment research. It was discovered in 1940." },
    "Rn": { n: 86, name: "Radon", cat: "noble-gas", x: 18, y: 6, mass: "222", config: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶", fact: "A radioactive gas that accumulates in basements.", period: 6, summary: "Radon is a radioactive gas that forms naturally from the decay of uranium. It can collect in buildings and become a health risk. Radon exposure is linked to lung cancer. It is colorless and odorless. It was discovered in 1900." },
    "Fr": { n: 87, name: "Francium", cat: "alkali-metal", x: 1, y: 7, mass: "223", config: "[Rn] 7s¹", fact: "Francium is so rare that there is only about 1 ounce of it on Earth at any given time!", period: 7, summary: "Francium is an extremely rare and highly radioactive metal. It exists only in very small amounts in nature. It is very unstable and quickly decays. Scientists mainly study it for research. It was discovered in 1939." },
    "Ra": { n: 88, name: "Radium", cat: "alkaline-earth", x: 2, y: 7, mass: "226", config: "[Rn] 7s²", fact: "Formerly used in glow-in-the-dark watches.", period: 7, summary: "Radium is a radioactive element once used in glowing paints. It produces light due to its radioactivity. However, it is very dangerous to health. Its use is now restricted. It was discovered in 1898." },
    "Ac": { n: 89, name: "Actinium", cat: "actinide", x: 3, y: 10, mass: "227", config: "[Rn] 6d¹ 7s²", fact: "Glows blue in the dark.", period: 7, summary: "Actinium is a radioactive metal that glows faintly in the dark. It is mainly used for scientific research. It is part of the actinide series. It can also be used in cancer treatment studies. It was discovered in 1899." },
    "Th": { n: 90, name: "Thorium", cat: "actinide", x: 4, y: 10, mass: "232.04", config: "[Rn] 6d² 7s²", fact: "Potential fuel for nuclear reactors.", period: 7, summary: "Thorium is a radioactive metal that can be used as a potential nuclear fuel. It is more abundant than uranium. It is also used in some alloys and scientific equipment. Thorium has been studied for energy production. It was discovered in 1828." },
    "Pa": { n: 91, name: "Protactinium", cat: "actinide", x: 5, y: 10, mass: "231.04", config: "[Rn] 5f² 6d¹ 7s²", fact: "Very rare and toxic.", period: 7, summary: "Protactinium is a rare and radioactive element. It is mainly used for research purposes. It occurs in very small amounts in uranium ores. Handling it is difficult due to radioactivity. It was discovered in 1913." },
    "U": { n: 92, name: "Uranium", cat: "actinide", x: 6, y: 10, mass: "238.03", config: "[Rn] 5f³ 6d¹ 7s²", fact: "Primary fuel for nuclear power.", period: 7, summary: "Uranium is a radioactive metal used as fuel in nuclear power plants. It can produce a large amount of energy. Uranium is also used in nuclear weapons. It occurs naturally in rocks and soil. It was discovered in 1789." },
    "Np": { n: 93, name: "Neptunium", cat: "actinide", x: 7, y: 10, mass: "237", config: "[Rn] 5f⁴ 6d¹ 7s²", fact: "Found in nuclear waste.", period: 7, summary: "Neptunium is a radioactive element produced in nuclear reactors. It is part of the actinide series. It is mainly used for research. Neptunium is not found naturally in large amounts. It was discovered in 1940." },
    "Pu": { n: 94, name: "Plutonium", cat: "actinide", x: 8, y: 10, mass: "244", config: "[Rn] 5f⁶ 7s²", fact: "Used in space probes.", period: 7, summary: "Plutonium is a radioactive metal used in nuclear weapons and power generation. It can produce a large amount of energy. It must be handled very carefully. Plutonium is created in nuclear reactors. It was discovered in 1940." },
    "Am": { n: 95, name: "Americium", cat: "actinide", x: 9, y: 10, mass: "243", config: "[Rn] 5f⁷ 7s²", fact: "Used in smoke detectors.", period: 7, summary: "Americium is a radioactive element used in smoke detectors. It helps detect smoke particles in the air. It is produced in nuclear reactors. Americium is mainly used in small amounts. It was discovered in 1944." },
    "Cm": { n: 96, name: "Curium", cat: "actinide", x: 10, y: 10, mass: "247", config: "[Rn] 5f⁷ 6d¹ 7s²", fact: "Named after Marie and Pierre Curie.", period: 7, summary: "Curium is a radioactive element used in scientific research. It is produced artificially in laboratories. It is part of the actinide series. Curium has strong radioactivity. It was discovered in 1944." },
    "Bk": { n: 97, name: "Berkelium", cat: "actinide", x: 11, y: 10, mass: "247", config: "[Rn] 5f⁹ 7s²", fact: "Named after Berkeley, California.", period: 7, summary: "Berkelium is a synthetic radioactive element. It is created in nuclear reactors and laboratories. It is mainly used for research. Only small amounts have been produced. It was discovered in 1949." },
    "Cf": { n: 98, name: "Californium", cat: "actinide", x: 12, y: 10, mass: "251", config: "[Rn] 5f¹⁰ 7s²", fact: "Used to start nuclear reactors.", period: 7, summary: "Californium is a very radioactive element used in neutron sources. It is useful in scientific research and some industrial uses. It can also help start nuclear reactors. Californium is very rare and expensive. It was discovered in 1950." },
    "Es": { n: 99, name: "Einsteinium", cat: "actinide", x: 13, y: 10, mass: "252", config: "[Rn] 5f¹¹ 7s²", fact: "Named after Albert Einstein.", period: 7, summary: "Einsteinium is a synthetic radioactive element. It is produced during nuclear reactions. Scientists mainly study it for research purposes. Very small amounts exist. It was discovered in 1952." },
    "Fm": { n: 100, name: "Fermium", cat: "actinide", x: 14, y: 10, mass: "257", config: "[Rn] 5f¹² 7s²", fact: "Named after Enrico Fermi.", period: 7, summary: "Fermium is another synthetic element created in nuclear experiments. It does not exist naturally on Earth. It is used only for scientific research. Fermium is highly radioactive. It was discovered in 1952." },
    "Md": { n: 101, name: "Mendelevium", cat: "actinide", x: 15, y: 10, mass: "258", config: "[Rn] 5f¹³ 7s²", fact: "Named after Dmitri Mendeleev.", period: 7, summary: "Mendelevium is a man-made radioactive element. It is created in particle accelerators. Scientists study its properties in laboratories. Only tiny amounts have been produced. It was discovered in 1955." },
    "No": { n: 102, name: "Nobelium", cat: "actinide", x: 16, y: 10, mass: "259", config: "[Rn] 5f¹⁴ 7s²", fact: "Named after Alfred Nobel.", period: 7, summary: "Nobelium is a synthetic radioactive element. It is produced in laboratories by nuclear reactions. Its properties are still being studied. Very little is known about it. It was discovered in 1958." },
    "Lr": { n: 103, name: "Lawrencium", cat: "actinide", x: 17, y: 10, mass: "266", config: "[Rn] 5f¹⁴ 7s² 7p¹", fact: "Named after Ernest Lawrence.", period: 7, summary: "Lawrencium is a man-made element in the actinide series. It is produced in particle accelerators. It exists only for a short time before decaying. It is used only for research. It was discovered in 1961." },
    "Rf": { n: 104, name: "Rutherfordium", cat: "transition-metal", x: 4, y: 7, mass: "267", config: "[Rn] 5f¹⁴ 6d² 7s²", fact: "Highly radioactive synthetic element.", period: 7, summary: "Rutherfordium is a synthetic element created in laboratories. It is very unstable and radioactive. Scientists study it to understand heavy elements. It does not exist naturally. It was discovered in 1964." },
    "Db": { n: 105, name: "Dubnium", cat: "transition-metal", x: 5, y: 7, mass: "268", config: "[Rn] 5f¹⁴ 6d³ 7s²", fact: "Named after Dubna, Russia.", period: 7, summary: "Dubnium is a man-made radioactive element. It is produced in particle accelerators. Only a few atoms have ever been made. Scientists research its properties. It was discovered in 1967." },
    "Sg": { n: 106, name: "Seaborgium", cat: "transition-metal", x: 6, y: 7, mass: "269", config: "[Rn] 5f¹⁴ 6d⁴ 7s²", fact: "Named after Glenn Seaborg.", period: 7, summary: "Seaborgium is a synthetic element named after scientist Glenn Seaborg. It is created in laboratories and decays quickly. It is used only in research. Very small amounts exist. It was discovered in 1974." },
    "Bh": { n: 107, name: "Bohrium", cat: "transition-metal", x: 7, y: 7, mass: "270", config: "[Rn] 5f¹⁴ 6d⁵ 7s²", fact: "Named after Niels Bohr.", period: 7, summary: "Bohrium is a radioactive element made in laboratories. It is very unstable and exists only briefly. Scientists study it to learn about heavy elements. Only a few atoms have been produced. It was discovered in 1981." },
    "Hs": { n: 108, name: "Hassium", cat: "transition-metal", x: 8, y: 7, mass: "277", config: "[Rn] 5f¹⁴ 6d⁶ 7s²", fact: "Named after Hesse, Germany.", period: 7, summary: "Hassium is a synthetic element created in particle accelerators. It is very heavy and radioactive. Scientists use it to study nuclear physics. It decays quickly. It was discovered in 1984." },
    "Mt": { n: 109, name: "Meitnerium", cat: "transition-metal", x: 9, y: 7, mass: "278", config: "[Rn] 5f¹⁴ 6d⁷ 7s²", fact: "Named after Lise Meitner.", period: 7, summary: "Meitnerium is a man-made radioactive element. It is extremely unstable and exists for a short time. It is studied only in laboratories. Very few atoms have been produced. It was discovered in 1982." },
    "Ds": { n: 110, name: "Darmstadtium", cat: "transition-metal", x: 10, y: 7, mass: "281", config: "[Rn] 5f¹⁴ 6d⁹ 7s¹", fact: "Named after Darmstadt, Germany.", period: 7, summary: "Darmstadtium is a synthetic element created in a laboratory in Germany. It is highly unstable and radioactive. It exists only for a very short time. Scientists study it to understand superheavy elements. It was discovered in 1994." },
    "Rg": { n: 111, name: "Roentgenium", cat: "transition-metal", x: 11, y: 7, mass: "282", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s¹", fact: "Named after Wilhelm Röntgen.", period: 7, summary: "Roentgenium is a man-made element produced in particle accelerators. It is extremely unstable and decays quickly. Only a few atoms have been observed. Research is still ongoing about it. It was discovered in 1994." },
    "Cn": { n: 112, name: "Copernicium", cat: "transition-metal", x: 12, y: 7, mass: "285", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s²", fact: "Named after Nicolaus Copernicus.", period: 7, summary: "Copernicium is a very heavy synthetic element. It is highly radioactive and unstable. Scientists have created only small amounts in laboratories. It exists for only a short time. It was discovered in 1996." },
    "Nh": { n: 113, name: "Nihonium", cat: "post-transition", x: 13, y: 7, mass: "286", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹", fact: "First element discovered in Asia (Japan).", period: 7, summary: "Nihonium is a superheavy element created in Japan. It is very unstable and radioactive. Scientists study it to learn more about atomic structure. Only a few atoms have been made. It was discovered in 2004." },
    "Fl": { n: 114, name: "Flerovium", cat: "post-transition", x: 14, y: 7, mass: "289", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²", fact: "Named after Flerov Laboratory.", period: 7, summary: "Flerovium is a synthetic element produced in nuclear research laboratories. It is very heavy and unstable. It decays quickly after being formed. Scientists continue to study it. It was discovered in 1998." },
    "Mc": { n: 115, name: "Moscovium", cat: "post-transition", x: 15, y: 7, mass: "290", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³", fact: "Named after Moscow region.", period: 7, summary: "Moscovium is a superheavy radioactive element. It is created in particle accelerators. Only a few atoms have been produced so far. It exists for a very short time. It was discovered in 2003." },
    "Lv": { n: 116, name: "Livermorium", cat: "post-transition", x: 16, y: 7, mass: "293", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴", fact: "Named after Lawrence Livermore National Lab.", period: 7, summary: "Livermorium is a synthetic element created in laboratories. It is extremely unstable and radioactive. Scientists study it to understand heavy elements better. Very few atoms have been produced. It was discovered in 2000." },
    "Ts": { n: 117, name: "Tennessine", cat: "metalloid", x: 17, y: 7, mass: "294", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵", fact: "Named after Tennessee.", period: 7, summary: "Tennessine is a superheavy element created by nuclear reactions. It is very unstable and exists only briefly. Scientists are still studying its properties. It belongs to the halogen group. It was discovered in 2010." },
    "Og": { n: 118, name: "Oganesson", cat: "noble-gas", x: 18, y: 7, mass: "294", config: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶", fact: "Heaviest known element.", period: 7, summary: "Oganesson is the heaviest known element in the periodic table. It is extremely unstable and radioactive. It exists only for a very short time after being created. Scientists study it to understand the limits of matter. It was discovered in 2002." }
};

// Dedicated hints for the Periodic Puzzle mini-game. These are written
// specifically to NOT reveal the element's own name — unlike the `fact`
// field above (used in the info modal), which sometimes states the name
// directly (e.g. "Lithium is the lightest metal") and would give the
// answer away if reused as a puzzle hint.
export const puzzleHints = {
    "H": "The lightest and simplest element in the universe — just one proton and one electron.",
    "He": "A noble gas so light it makes balloons float and your voice sound higher if you breathe it in.",
    "Li": "The lightest metal on the periodic table, used inside rechargeable batteries.",
    "Be": "A toxic alkaline-earth metal that's surprisingly sweet-tasting — never taste it though!",
    "B": "A metalloid added to glass fibers to make them stronger and heat-resistant.",
    "C": "Forms both soft pencil lead and the hardest natural gemstone, depending on its structure.",
    "N": "Makes up about 78% of the air you're breathing right now.",
    "O": "The gas your body needs most to survive, making up about 21% of the air.",
    "F": "A reactive gas added to toothpaste and drinking water to protect teeth from decay.",
    "Ne": "A noble gas that glows reddish-orange in glass tubes used for bright signs.",
    "Na": "A soft alkali metal you can cut with a butter knife, found in table salt.",
    "Mg": "A bright-burning alkaline-earth metal used in flares and fireworks.",
    "Al": "The most common metal in Earth's crust, used in soda cans and aircraft.",
    "Si": "A metalloid that forms the basis of computer chips and is found in sand.",
    "P": "A nonmetal essential for life, found in DNA and bones.",
    "S": "A yellow nonmetal used to make gunpowder and matches.",
    "Cl": "A nonmetal gas used to disinfect swimming pools and drinking water.",
    "Ar": "A noble gas once used to fill old-style incandescent light bulbs.",
    "K": "An alkali metal vital for nerve signals and muscle function in your body.",
    "Ca": "An alkaline-earth metal that keeps your bones and teeth strong.",
    "Sc": "A lightweight transition metal used in aerospace parts and baseball bats.",
    "Ti": "A transition metal as strong as steel but much lighter, used in jet engines.",
    "V": "A transition metal added to steel to make it more shock-resistant.",
    "Cr": "A transition metal that gives rubies their deep red color.",
    "Mn": "A transition metal that plants need for photosynthesis to work.",
    "Fe": "The most abundant metal on Earth by mass, found at the planet's core.",
    "Co": "A transition metal used to make some of the strongest magnets.",
    "Ni": "A transition metal commonly used in coins and stainless steel.",
    "Cu": "A reddish transition metal that conducts electricity extremely well, used in wiring.",
    "Zn": "A transition metal coated onto steel to stop it from rusting.",
    "Ga": "A post-transition metal with such a low melting point it can melt in your hand.",
    "Ge": "A metalloid used to make fiber optic cables for the internet.",
    "As": "A metalloid that was historically used as a poison.",
    "Se": "A nonmetal once widely used inside photocopier machines.",
    "Br": "A reddish-brown nonmetal that's a liquid at room temperature.",
    "Kr": "A noble gas used in the bright flashes of high-speed photography.",
    "Rb": "A soft alkali metal used inside extremely precise atomic clocks.",
    "Sr": "An alkaline-earth metal that gives fireworks a vivid crimson-red color.",
    "Y": "A transition metal used in LED lights and glowing phosphor screens.",
    "Zr": "A transition metal used to build the cores of nuclear reactors.",
    "Nb": "A transition metal used in superconducting magnets, like those in MRI machines.",
    "Mo": "A transition metal that helps plants convert nitrogen from the air.",
    "Tc": "The first element ever created artificially in a lab rather than found in nature.",
    "Ru": "A transition metal that resists tarnishing even at room temperature.",
    "Rh": "One of the rarest and most expensive metals, used in car exhaust systems.",
    "Pd": "A transition metal that's a key ingredient inside catalytic converters.",
    "Ag": "A shiny transition metal with the best electrical conductivity of any element.",
    "Cd": "A transition metal once commonly used inside rechargeable batteries.",
    "In": "A post-transition metal used to make touchscreens responsive to your finger.",
    "Sn": "A post-transition metal used to coat steel cans and prevent corrosion.",
    "Sb": "A metalloid added to fabrics and plastics to make them flame-resistant.",
    "Te": "A metalloid used in the manufacturing of solar panels.",
    "I": "A nonmetal your thyroid gland needs to function properly.",
    "Xe": "A noble gas used as fuel in some spacecraft ion propulsion engines.",
    "Cs": "An alkali metal used inside the most accurate atomic clocks ever built.",
    "Ba": "An alkaline-earth metal swallowed before certain medical X-ray scans.",
    "La": "The very first element in the lanthanide row of the periodic table.",
    "Ce": "A lanthanide used in the coating of self-cleaning ovens.",
    "Pr": "A lanthanide used to strengthen the metal alloys in aircraft engines.",
    "Nd": "A lanthanide responsible for the strongest permanent magnets ever made.",
    "Pm": "A radioactive lanthanide once used to power small nuclear batteries.",
    "Sm": "A lanthanide used in certain targeted cancer treatment drugs.",
    "Eu": "A lanthanide used in tiny anti-counterfeiting marks on Euro banknotes.",
    "Gd": "A lanthanide injected as a contrast agent before MRI scans.",
    "Tb": "A lanthanide responsible for the green glow in certain phosphor screens.",
    "Dy": "A lanthanide used in the control rods of nuclear reactors.",
    "Ho": "A lanthanide with the strongest magnetic pull of any known element.",
    "Er": "A lanthanide used in the lasers found in surgical equipment.",
    "Tm": "A rare lanthanide used to power small, portable X-ray machines.",
    "Yb": "A lanthanide sometimes added to improve certain stainless steel alloys.",
    "Lu": "A lanthanide used in the detectors of PET medical scanners.",
    "Hf": "A transition metal used in the control rods of nuclear submarines.",
    "Ta": "A transition metal essential inside the tiny capacitors of mobile phones.",
    "W": "The transition metal with the highest melting point of any metal on the table.",
    "Re": "A rare transition metal used in the turbine blades of jet engines.",
    "Os": "The densest naturally occurring element known.",
    "Ir": "An extremely corrosion-resistant transition metal often found in meteorites.",
    "Pt": "A precious transition metal popular in fine jewelry and lab equipment.",
    "Au": "The most malleable metal — it can be hammered into incredibly thin sheets.",
    "Hg": "A transition metal that's liquid at room temperature, once used in old thermometers.",
    "Tl": "A highly toxic post-transition metal, historically used in rat poison.",
    "Pb": "A dense post-transition metal once used in pipes, now used in radiation shielding.",
    "Bi": "A post-transition metal that can be grown into colorful, staircase-shaped crystals.",
    "Po": "A highly radioactive metalloid first discovered by Marie Curie.",
    "At": "The rarest naturally occurring element on Earth.",
    "Rn": "A radioactive noble gas that can seep into and build up in basements.",
    "Fr": "An extremely rare alkali metal — only about an ounce is estimated to exist on Earth at any time.",
    "Ra": "A radioactive alkaline-earth metal once used in glow-in-the-dark watch dials.",
    "Ac": "A rare radioactive metal at the start of its own row, known to glow faintly blue in the dark.",
    "Th": "A radioactive metal being researched as a potential nuclear reactor fuel.",
    "Pa": "An extremely rare and toxic radioactive metal near the start of the actinide row.",
    "U": "The primary radioactive fuel used to power nuclear plants.",
    "Np": "A radioactive metal commonly found in the waste from nuclear reactors.",
    "Pu": "A radioactive metal that has powered the electronics on deep-space probes.",
    "Am": "A radioactive metal found inside many household smoke detectors.",
    "Cm": "A radioactive metal named in honor of a famous scientist couple.",
    "Bk": "A radioactive metal named after a university city in California.",
    "Cf": "A radioactive metal sometimes used to help start up nuclear reactors.",
    "Es": "A radioactive metal named in honor of a famous physicist known for relativity.",
    "Fm": "A radioactive metal named after a physicist who built the first nuclear reactor.",
    "Md": "A radioactive metal named after the scientist who organized the periodic table.",
    "No": "A radioactive metal named in honor of the founder of a famous science prize.",
    "Lr": "A radioactive metal named after a physicist known for inventing the cyclotron.",
    "Rf": "A highly radioactive, lab-made transition metal near the start of period 7.",
    "Db": "A synthetic transition metal named after a Russian research city.",
    "Sg": "A synthetic transition metal named after a pioneering nuclear chemist.",
    "Bh": "A synthetic transition metal named after a famous quantum physicist.",
    "Hs": "A synthetic transition metal named after a German state.",
    "Mt": "A synthetic transition metal named after a pioneering female physicist.",
    "Ds": "A synthetic transition metal named after the German city where it was discovered.",
    "Rg": "A synthetic transition metal named after the discoverer of X-rays.",
    "Cn": "A synthetic transition metal named after a famous astronomer.",
    "Nh": "A post-transition metal and the first element ever discovered in Asia.",
    "Fl": "A synthetic post-transition metal named after a Russian research laboratory.",
    "Mc": "A synthetic post-transition metal named after the Russian capital region.",
    "Lv": "A synthetic post-transition metal named after a US national laboratory.",
    "Ts": "A synthetic metalloid named after a US state known for nuclear research.",
    "Og": "The heaviest element ever confirmed on the periodic table.",
};

// Periodic Puzzle sound effects — created once at module load (not inside
// the component, where useRef(new Audio(...)) would otherwise construct a
// new Audio() on every single render, most of which get discarded immediately).
const puzzleSndHint = new Audio('/assets/audio/hint.mp3');
const puzzleSndError = new Audio('/assets/audio/error.mp3');
const puzzleSndCorrect = new Audio('/assets/audio/correct.mp3');
const puzzleSndComplete = new Audio('/assets/audio/complete.mp3');
const puzzleSndGameOver = new Audio('/assets/audio/gameover.mp3');

// Plays a sound from the start, tolerating browsers that block autoplay
// before any user interaction has occurred on the page (common on first
// load) — failures here are silently logged, never thrown, so a blocked
// sound never breaks the actual game logic around it.
const playPuzzleSound = (audio) => {
    audio.currentTime = 0;
    audio.play().catch(err => console.warn('Could not play sound:', err));
};


export default function PeriodicTable() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = sessionStorage.getItem('loggedInUser') || 'Scientist';
    const storageKey = `learnedElements_${currentUser}`;
    const puzzleCategoriesKey = `puzzleCategoriesCompleted_${currentUser}`; // array of category ids completed at least once
    const puzzleCountKey = `puzzlesCompleted_${currentUser}`;               // total completion count (replays count too)
    const puzzleBadgesKey = `puzzleBadges_${currentUser}`;

    // State
    const [learnedElements, setLearnedElements] = useState(() => new Set(JSON.parse(localStorage.getItem(storageKey)) || []));
    const [showModal, setShowModal] = useState(false);
    const [selectedElement, setSelectedElement] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [learningFilter, setLearningFilter] = useState('none'); // 'none', 'learned', 'not-learned'
    const [isExpandedTable, setIsExpandedTable] = useState(false);
    const [showDesktopAr, setShowDesktopAr] = useState(false);
    const [reviewElements, setReviewElements] = useState(location.state?.highlightElements || []);
    const [qrUrl, setQrUrl] = useState('');

    // ── Periodic Puzzle mini-game state ──────────────────────────────────────
    const [showPuzzleSetup, setShowPuzzleSetup] = useState(false);   // category-select screen
    const [showPuzzleInstructions, setShowPuzzleInstructions] = useState(false);
    const [puzzleActive, setPuzzleActive] = useState(false);         // game actually running, full-screen
    const [puzzleCategory, setPuzzleCategory] = useState('all');
    const [puzzleTray, setPuzzleTray] = useState([]);                // symbols left to place
    const [puzzlePlaced, setPuzzlePlaced] = useState({});            // { symbol: true } once correctly placed
    const [puzzleWrongTile, setPuzzleWrongTile] = useState(null);    // symbol of the tile just mis-placed on (for shake feedback)
    const [puzzleComplete, setPuzzleComplete] = useState(false);
    const [selectedTileSymbol, setSelectedTileSymbol] = useState(null); // blank tile tapped — opens the question modal for this tile
    const [puzzleWrongCount, setPuzzleWrongCount] = useState(0);     // total wrong placements this game, across all tiles
    const [puzzleGameOver, setPuzzleGameOver] = useState(false);     // wrong-attempt limit reached
    const [puzzleSuccessSymbol, setPuzzleSuccessSymbol] = useState(null); // symbol just correctly placed — shows the success modal
    const [puzzleMistakeToast, setPuzzleMistakeToast] = useState(null); // { key } transient "X mistakes left" notification
    const [puzzleModalOptions, setPuzzleModalOptions] = useState([]); // option chips for the currently-open question modal, fixed at open time so they don't reshuffle on re-render
    const puzzleContainerRef = useRef(null);

    // Wrong-attempt limits per category, scaled roughly to category size so
    // "All" (118 elements) allows more room for mistakes than a small
    // category like Alkali Metals (6 elements). Tap-to-place replaced
    // drag-and-drop (HTML5 DnD doesn't fire on touch devices at all, which
    // was the actual cause of the puzzle being unplayable on phones/tablets).
    const puzzleWrongLimits = {
        "all": 15,
        "alkali-metal": 2,
        "alkaline-earth": 2,
        "noble-gas": 3,
        "nonmetal": 4,
        "post-transition": 4,
        "metalloid": 4,
        "transition-metal": 6,
        "lanthanide": 7,
        "actinide": 7,
    };

    // Auto-scroll to highlighted element in full screen mode
    useEffect(() => {
        if (isExpandedTable && searchTerm.trim() !== '') {
            const timer = setTimeout(() => {
                const highlightedTiles = document.querySelectorAll('.element-tile.highlighted');
                if (highlightedTiles.length > 0) {
                    // Scroll the first matched element into the center of the screen
                    highlightedTiles[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 300); // Delay allows user to finish typing before scrolling
            return () => clearTimeout(timer);
        }
    }, [searchTerm, isExpandedTable]);

    // Keep puzzleActive in sync if the student exits fullscreen via the
    // browser's own controls (Esc key, swipe-down on mobile, etc.) instead
    // of our in-game Exit button — without this, the React state would
    // think the puzzle is still "active" while the browser has already
    // dropped out of fullscreen.
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && puzzleActive) {
                setPuzzleActive(false);
                setPuzzleTray([]);
                setPuzzlePlaced({});
                setPuzzleWrongTile(null);
                setPuzzleComplete(false);
                setSelectedTileSymbol(null);
                setPuzzleWrongCount(0);
                setPuzzleGameOver(false);
                setPuzzleSuccessSymbol(null);
                setPuzzleMistakeToast(null);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [puzzleActive]);

    // Request fullscreen once puzzleActive becomes true. This runs in an
    // effect (after React has committed the .puzzle-fullscreen div to the
    // DOM) rather than inside startPuzzleGame directly, since the ref would
    // still be null at the moment setPuzzleActive(true) is called — state
    // updates and DOM mounts happen asynchronously relative to that call.
    useEffect(() => {
        if (puzzleActive && puzzleContainerRef.current?.requestFullscreen) {
            puzzleContainerRef.current.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        }
    }, [puzzleActive]);

    // Clears the question modal's option list whenever it closes, regardless
    // of which code path closed it (correct answer, Game Over, exit, etc.) —
    // centralizing this in one effect avoids needing to remember to reset it
    // at every individual call site that sets selectedTileSymbol to null.
    useEffect(() => {
        if (!selectedTileSymbol) {
            setPuzzleModalOptions([]);
        }
    }, [selectedTileSymbol]);

    // Fetch learned elements from the cloud on mount
    useEffect(() => {
        const syncData = async () => {
            try {
                const userRef = doc(db, "users", currentUser);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().learnedElements) {
                    const cloudData = userSnap.data().learnedElements;
                    setLearnedElements(new Set(cloudData));
                    localStorage.setItem(storageKey, JSON.stringify(cloudData));
                }
            } catch (e) { console.error("Error syncing learned elements:", e); }
        };
        syncData();
    }, [currentUser, storageKey]);

    // Mobile Detection & Desktop AR Fallback
    const isMobileDevice = () => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMacTablet = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        return isMobile || isMacTablet;
    };

    const openDesktopAR = () => {
        // Point to a dedicated, public AR viewer route — not the current
        // (login-protected) page — so scanning the QR code on a phone opens
        // the 3D model directly instead of redirecting to Login.
        const arUrl = new URL(window.location.origin + '/ar-view');
        arUrl.searchParams.set('element', selectedElement.symbol);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(arUrl.toString())}`);
        setShowDesktopAr(true);
    };

    // Load Google's <model-viewer> component for Markerless AR
    useEffect(() => {
        if (!document.getElementById('model-viewer-script')) {
            const script = document.createElement('script');
            script.id = 'model-viewer-script';
            script.type = 'module';
            script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
            document.head.appendChild(script);
        }
    }, []);

    // Marks an element as learned (syncs to Firestore) without necessarily
    // showing the full info modal — used by the puzzle's own success modal,
    // which shows a different, game-specific celebration instead.
    const markElementLearned = (symbol) => {
        if (!learnedElements.has(symbol)) {
            setLearnedElements(prev => {
                const newSet = new Set(prev).add(symbol);
                const newArray = [...newSet];
                localStorage.setItem(storageKey, JSON.stringify(newArray));
                setDoc(doc(db, "users", currentUser), { learnedElements: newArray }, { merge: true }).catch(e => console.error(e));
                return newSet;
            });
        }
    };

    const openModal = (symbol) => {
        const el = elementData[symbol];
        setSelectedElement({ ...el, symbol });
        setShowModal(true);
        document.body.style.overflow = 'hidden';
        markElementLearned(symbol);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedElement(null);
        document.body.style.overflow = '';
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    };

    // ── Periodic Puzzle mini-game ────────────────────────────────────────────
    // Tiles for the chosen category render blank and grayscale; the student
    // drags each element's symbol from the bottom tray onto its correct grid
    // position. Reuses the existing elementData (x/y grid coords, fact field
    // as the hint) and the existing element-info modal for correct placements.
    const getPuzzleElementSymbols = (category) => {
        return Object.entries(elementData)
            .filter(([, el]) => category === 'all' || el.cat === category)
            .map(([symbol]) => symbol);
    };

    const shuffleArray = (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    // Friendly display labels for each category, used in the tray's filter header.
    const categoryLabels = {
        "alkali-metal": "Alkali Metals",
        "alkaline-earth": "Alkaline Earth Metals",
        "transition-metal": "Transition Metals",
        "post-transition": "Post-Transition Metals",
        "metalloid": "Metalloids",
        "nonmetal": "Nonmetals",
        "noble-gas": "Noble Gases",
        "lanthanide": "Lanthanides",
        "actinide": "Actinides",
    };

    // Tapping a blank tile selects it, which filters the tray down to just
    // that tile's category — e.g. tapping an alkali metal tile shows only
    // the remaining alkali metal chips, instead of all 118 at once. This
    // keeps "All" from being overwhelming while the puzzle stays a genuine
    // challenge (same-category chips still include wrong options to pick from).
    //
    // Near the end of a category, puzzleTray alone can shrink to just the
    // correct answer with no decoys left (everything else already placed),
    // turning the "choice" into a forced single tap. To keep it a genuine
    // multiple-choice question throughout, we top up with decoys pulled from
    // already-placed elements in the same category (safe to show — tapping
    // one is simply a wrong answer, it doesn't un-place anything) until
    // there are at least MIN_OPTIONS, capped at the category's actual size.
    const MIN_PUZZLE_OPTIONS = 6;
    const getFilteredTray = (tileSymbol) => {
        if (!tileSymbol) return [];
        const targetCat = elementData[tileSymbol].cat;
        const unplacedInCat = puzzleTray.filter(symbol => elementData[symbol].cat === targetCat);

        if (unplacedInCat.length >= MIN_PUZZLE_OPTIONS) {
            return shuffleArray(unplacedInCat);
        }

        const placedInCat = Object.keys(puzzlePlaced).filter(symbol => elementData[symbol].cat === targetCat);
        const needed = MIN_PUZZLE_OPTIONS - unplacedInCat.length;
        const decoys = shuffleArray(placedInCat).slice(0, needed);

        return shuffleArray([...unplacedInCat, ...decoys]);
    };

    const selectPuzzleTile = (symbol) => {
        setSelectedTileSymbol(symbol);
        setPuzzleModalOptions(getFilteredTray(symbol));
        playPuzzleSound(puzzleSndHint);
    };

    const openPuzzleSetup = () => {
        setShowPuzzleInstructions(true);
    };

    // Deep-link support: the "Play Now" button on the Periodic Puzzle stat
    // card (StudentHome) navigates here with { autoOpenPuzzle: true } so the
    // student lands straight on the instructions screen instead of having to
    // find and click "Play Periodic Puzzle" on this page first.
    useEffect(() => {
        if (location.state?.autoOpenPuzzle) {
            setShowPuzzleInstructions(true);
            // Clear the flag from history state so refreshing/navigating back
            // doesn't keep re-opening the instructions modal.
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const proceedToCategorySelect = () => {
        setShowPuzzleInstructions(false);
        setShowPuzzleSetup(true);
    };

    const startPuzzleGame = (category) => {
        const symbols = getPuzzleElementSymbols(category);
        setPuzzleCategory(category);
        setPuzzleTray(shuffleArray(symbols));
        setPuzzlePlaced({});
        setPuzzleWrongTile(null);
        setPuzzleComplete(false);
        setSelectedTileSymbol(null);
        setPuzzleWrongCount(0);
        setPuzzleGameOver(false);
        setPuzzleSuccessSymbol(null);
        setPuzzleMistakeToast(null);
        setShowPuzzleSetup(false);
        setPuzzleActive(true);
        // Fullscreen is requested in a useEffect (see below) once puzzleActive
        // becomes true and the .puzzle-fullscreen div has actually mounted —
        // calling requestFullscreen() here would run before React commits the
        // DOM update, so puzzleContainerRef.current would still be null.
    };

    const exitPuzzleGame = () => {
        setPuzzleActive(false);
        setPuzzleTray([]);
        setPuzzlePlaced({});
        setPuzzleWrongTile(null);
        setPuzzleComplete(false);
        setSelectedTileSymbol(null);
        setPuzzleWrongCount(0);
        setPuzzleGameOver(false);
        setPuzzleSuccessSymbol(null);
        setPuzzleMistakeToast(null);

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.warn(e));
        }
    };

    // All selectable category ids (mirrors the buttons on the setup screen),
    // used to detect when a student has cleared every category at least once.
    const ALL_PUZZLE_CATEGORIES = [
        'alkali-metal', 'alkaline-earth', 'transition-metal', 'post-transition',
        'metalloid', 'nonmetal', 'noble-gas', 'lanthanide', 'actinide',
    ];

    // Persists progress for the Periodic Puzzle mini-game, mirroring the
    // pattern used for learnedElements: write to localStorage immediately,
    // then sync to Firestore so Achievements/StudentHome can read it.
    const savePuzzleCompletion = (category) => {
        // Total completions (replays of the same category still count toward this)
        const prevCount = parseInt(localStorage.getItem(puzzleCountKey) || '0', 10);
        const newCount = prevCount + 1;
        localStorage.setItem(puzzleCountKey, newCount.toString());

        // Unique categories completed at least once
        const prevCats = new Set(JSON.parse(localStorage.getItem(puzzleCategoriesKey)) || []);
        prevCats.add(category);
        const newCats = [...prevCats];
        localStorage.setItem(puzzleCategoriesKey, JSON.stringify(newCats));

        // Badge checks
        const prevBadges = new Set(JSON.parse(localStorage.getItem(puzzleBadgesKey)) || []);
        if (newCount >= 1) prevBadges.add('puzzle-first');
        if (newCount >= 10) prevBadges.add('puzzle-veteran');
        const completedAllCategories = ALL_PUZZLE_CATEGORIES.every(c => prevCats.has(c));
        if (completedAllCategories) prevBadges.add('puzzle-master');
        if (category === 'all') prevBadges.add('puzzle-full-table');
        const newBadges = [...prevBadges];
        localStorage.setItem(puzzleBadgesKey, JSON.stringify(newBadges));

        // Sync to cloud so other pages (and other devices) pick it up
        setDoc(doc(db, "users", currentUser), {
            puzzlesCompleted: newCount,
            puzzleCategoriesCompleted: newCats,
            puzzleBadges: newBadges,
        }, { merge: true }).catch(e => console.error("Error saving puzzle stats:", e));
    };

    // Tapping a tray chip attempts to place it on the currently selected tile
    // (selectedTileSymbol). Replaces the old drag-and-drop flow entirely —
    // HTML5 Drag and Drop never fires from touch gestures, which was the
    // actual reason the puzzle was unplayable on phones/tablets/iPad.
    const attemptPlacement = (chosenSymbol) => {
        if (!selectedTileSymbol) return;
        const targetSymbol = selectedTileSymbol;

        if (chosenSymbol === targetSymbol) {
            // Correct placement
            playPuzzleSound(puzzleSndCorrect);
            const newPlaced = { ...puzzlePlaced, [targetSymbol]: true };
            setPuzzlePlaced(newPlaced);
            setPuzzleTray(prev => prev.filter(s => s !== chosenSymbol));
            setPuzzleWrongTile(null);
            setSelectedTileSymbol(null); // closes the question modal
            setPuzzleSuccessSymbol(targetSymbol); // opens the success modal instead

            markElementLearned(targetSymbol);

            // Check for full completion of this category — deferred until
            // the success modal's Next button is pressed (see proceedFromSuccess),
            // so the student always sees their last correct answer first.
        } else {
            // Wrong placement — shake feedback, plus count toward the
            // whole-game wrong-attempt limit (not per-tile). Hitting the
            // limit ends the game with a Game Over modal. The question
            // modal (selectedTileSymbol) stays open so they can try again.
            playPuzzleSound(puzzleSndError);
            setPuzzleWrongTile(targetSymbol);
            setTimeout(() => setPuzzleWrongTile(null), 600);

            setPuzzleWrongCount(prev => {
                const newCount = prev + 1;
                const limit = puzzleWrongLimits[puzzleCategory] ?? 5;
                const remaining = Math.max(0, limit - newCount);

                if (newCount >= limit) {
                    setSelectedTileSymbol(null); // close the question modal
                    setPuzzleGameOver(true);
                    playPuzzleSound(puzzleSndGameOver);
                } else {
                    // Transient toast — keyed by Date.now() so retriggering
                    // it (e.g. two wrong guesses in a row) restarts its
                    // fade-out animation instead of looking stuck.
                    const toastKey = Date.now();
                    setPuzzleMistakeToast({ key: toastKey, remaining });
                    setTimeout(() => {
                        setPuzzleMistakeToast(current => (current && current.key === toastKey) ? null : current);
                    }, 2200);
                }
                return newCount;
            });
        }
    };

    // Called from the success modal's "Next" button. Closes the success
    // modal and, if that was the last element in the category, triggers the
    // completion modal — deferred to here so the student sees their final
    // correct answer's success modal before the completion celebration.
    const proceedFromSuccess = () => {
        const justPlacedSymbol = puzzleSuccessSymbol;
        setPuzzleSuccessSymbol(null);

        if (justPlacedSymbol) {
            const totalInCategory = getPuzzleElementSymbols(puzzleCategory).length;
            // By the time the student taps "Next" (a separate, later click
            // event), React has already re-rendered with the updated
            // puzzlePlaced from attemptPlacement, so this closure has the
            // fresh count rather than a stale one.
            const placedCount = Object.keys(puzzlePlaced).length;
            if (placedCount >= totalInCategory) {
                setPuzzleComplete(true);
                playPuzzleSound(puzzleSndComplete);
                savePuzzleCompletion(puzzleCategory);
            }
        }
    };

    // Auto-open element if linked from a QR code
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const elementSymbol = params.get('element');
        if (elementSymbol && elementData[elementSymbol]) {
            setTimeout(() => openModal(elementSymbol), 100);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []); // Run once on mount

    const handlePronounce = () => {
        if (!selectedElement || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(selectedElement.name);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const getTileStyle = (symbol, category) => {
        let opacity = '1';
        let highlighted = false;
        const term = searchTerm.toLowerCase().trim();

        if (term) {
            const el = elementData[symbol];
            if (el.name.toLowerCase().includes(term) || symbol.toLowerCase().includes(term)) {
                highlighted = true;
            } else {
                opacity = '0.15';
            }
        } else if (reviewElements.length > 0) {
            if (reviewElements.includes(symbol)) {
                highlighted = true;
            } else {
                opacity = '0.15';
            }
        } else if (learningFilter !== 'none') {
            const isLearned = learnedElements.has(symbol);
            if ((learningFilter === 'learned' && isLearned) || (learningFilter === 'not-learned' && !isLearned)) {
                highlighted = true;
            } else {
                opacity = '0.15';
            }
        } else if (activeCategory !== 'all' && category !== activeCategory) {
            opacity = '0.15';
        }

        return { opacity, highlighted };
    };

    const handleCategoryClick = (category) => {
        setActiveCategory(category);
        setLearningFilter('none');
        setSearchTerm('');
        setReviewElements([]);
    };

    const handleLearningFilterClick = (type) => {
        const newFilter = learningFilter === type ? 'none' : type;
        setLearningFilter(newFilter);
        setActiveCategory('all');
        setSearchTerm('');
        setReviewElements([]);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setLearningFilter('none');
        setActiveCategory('all');
        setReviewElements([]);
    };

    const filterCategories = ["all", "alkali-metal", "alkaline-earth", "nonmetal", "noble-gas", "transition-metal", "post-transition", "metalloid", "lanthanide", "actinide"];

    // Array of floating items (icons and text) for the animated background
    const floatingItems = [
        { id: 1, icon: 'fas fa-atom', left: '10%', animDuration: '15s', delay: '0s', size: '3rem' },
        { id: 2, icon: 'fas fa-flask', left: '30%', animDuration: '20s', delay: '2s', size: '2.5rem' },
        { id: 3, text: 'H₂O', left: '50%', animDuration: '18s', delay: '4s', size: '2rem', fontWeight: 'bold' },
        { id: 4, icon: 'fas fa-vial', left: '70%', animDuration: '22s', delay: '1s', size: '3.5rem' },
        { id: 5, text: 'Au', left: '85%', animDuration: '16s', delay: '5s', size: '2.5rem', fontWeight: 'bold' },
        { id: 6, icon: 'fas fa-atom', left: '20%', animDuration: '25s', delay: '7s', size: '4rem' },
        { id: 7, text: 'O₂', left: '40%', animDuration: '19s', delay: '3s', size: '2.2rem', fontWeight: 'bold' },
        { id: 8, icon: 'fas fa-microscope', left: '60%', animDuration: '21s', delay: '6s', size: '3rem' },
        { id: 9, text: 'NaCl', left: '80%', animDuration: '24s', delay: '8s', size: '2.8rem', fontWeight: 'bold' },
        { id: 10, icon: 'fas fa-flask', left: '5%', animDuration: '17s', delay: '9s', size: '2rem' },
    ];

    const elementInfoModal = showModal && selectedElement && (
                <div className="modal-container show" onClick={closeModal}>
                    <div className="modal-content periodic-modal-landscape" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeModal}>&times;</button>
                        <header className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div className={`modal-symbol-card ${selectedElement.cat}-bg`}>
                                    <span className="atomic-number-large">{selectedElement.n}</span>
                                    <span>{selectedElement.symbol}</span>
                                </div>
                                <div className="modal-element-title">
                                    <h2 style={{ fontSize: '2rem', margin: 0 }}>{selectedElement.name}</h2>
                                    <button id="pronounceBtn" title="Pronounce Name" onClick={handlePronounce}><i className="fas fa-volume-up"></i></button>
                                </div>
                            </div>
                        </header>
                        <div className="detailed-info-container">
                            <div className="info-col">
                                <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '15px', lineHeight: '1.6', textAlign: 'justify' }}>{selectedElement.summary}</p>
                                <div className="data-grid">
                                    <div className="data-item"><p className="data-label">Atomic Mass</p><p className="data-value">{selectedElement.mass}</p></div>
                                    <div className="data-item"><p className="data-label">Category</p><p className="data-value" style={{ textTransform: 'capitalize' }}>{selectedElement.cat.replace('-', ' ')}</p></div>
                                    <div className="data-item"><p className="data-label">Period</p><p className="data-value">{selectedElement.period}</p></div>
                                    <div className="data-item"><p className="data-label">Group</p><p className="data-value">{selectedElement.x}</p></div>
                                </div>
                                <div className="fact-box electron-box">
                                    <i className="fas fa-code-branch"></i>
                                    <div><p className="data-label">Electron Configuration</p><p>{selectedElement.config}</p></div>
                                </div>
                                <div className="fact-box fun-fact-box" style={{ marginTop: '15px' }}>
                                    <i className="fas fa-lightbulb"></i>
                                    <div><p className="data-label">Fun Fact</p><p style={{ fontSize: '0.95rem' }}>{selectedElement.fact}</p></div>
                                </div>
                            </div>
                            <div className="modal-right-col">
                                <div className="element-image-box" style={{ width: '100%', maxWidth: '360px', height: '200px', margin: '0 auto 15px', backgroundColor: '#f0f0f0', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e1e1e1' }}>
                                    <img src={`/assets/elements/${selectedElement.name.toLowerCase()}.jpg`} alt={selectedElement.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                                    <span style={{ color: '#aaa', display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-image" style={{ fontSize: '2rem', marginBottom: '8px', color: '#ccc' }}></i> No Image Available</span>
                                </div>
                                <div className="element-model-box" style={{ width: '100%', maxWidth: '360px', height: '220px', margin: '0 auto 20px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e1e1e1', position: 'relative', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
                                    <model-viewer
                                        src={`/assets/models/${selectedElement.name.toLowerCase()}.glb`}
                                        alt={`3D model of ${selectedElement.name}`}
                                        auto-rotate
                                        rotation-per-second="45deg"
                                        camera-controls
                                        ar
                                        autoplay
                                        scale="0.4 0.4 0.4"
                                        ar-scale="fixed"
                                        ar-modes="webxr scene-viewer quick-look"
                                        style={{ width: '100%', height: '100%' }}
                                    >
                                        <button slot="ar-button" style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#6e45e2', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(110,69,226,0.3)' }}>
                                            <i className="fas fa-cube"></i> View in AR
                                        </button>
                                        <div slot="poster" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', color: '#888' }}>
                                            <i className="fas fa-cube" style={{ fontSize: '3rem', marginBottom: '10px', color: '#ccc' }}></i>
                                            <span>Loading 3D Model...</span>
                                        </div>
                                    </model-viewer>
                                    {!isMobileDevice() && (
                                        <button 
                                            onClick={openDesktopAR}
                                            style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#6e45e2', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(110,69,226,0.3)', zIndex: 10 }}
                                        >
                                            <i className="fas fa-cube"></i> View in AR
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    );

    return (
        <div style={{ background: '#f8faff', minHeight: '100vh', position: 'relative' }}>
            {/* Floating Chemistry Background */}
            <div className="floating-background">
                {floatingItems.map(item => (
                    <div 
                        key={item.id} 
                        className="floating-item" 
                        style={{ 
                            left: item.left, 
                            animationDuration: item.animDuration, 
                            animationDelay: item.delay,
                            fontSize: item.size,
                            fontWeight: item.fontWeight || 'normal'
                        }}
                    >
                        {item.icon ? <i className={item.icon}></i> : item.text}
                    </div>
                ))}
            </div>
            <style>
            {`
                .floating-background { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; overflow: hidden; }
                .floating-item { position: absolute; color: #6e45e2; opacity: 0.08; bottom: -100px; animation: float-up infinite linear; }
                @keyframes float-up { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(-120vh) rotate(360deg); } }

                @media (min-width: 768px) {
                    .periodic-modal-landscape {
                        max-width: 850px !important;
                        width: 90% !important;
                    }
                    .periodic-modal-landscape .modal-header {
                        margin-bottom: 25px !important;
                    }
                    .periodic-modal-landscape .detailed-info-container {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 40px !important;
                        align-items: flex-start !important;
                    }
                    .periodic-modal-landscape .info-col {
                        flex: 1;
                    }
                    .periodic-modal-landscape .modal-right-col {
                        width: 360px;
                        flex-shrink: 0;
                    }
                }
            `}
            </style>
             <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }}><i className="fas fa-atom"></i> <span>AtomARix</span></div>
                <ul className="nav-links">
                    <li onClick={() => navigate('/home')}><i className="fas fa-home"></i> <span>Home</span></li>
                    <li className="active"><i className="fas fa-th"></i> <span>Periodic Table</span></li>
                    <li onClick={() => navigate('/laboratory')}><i className="fas fa-flask"></i> <span>Laboratory</span></li>
                    <li onClick={() => navigate('/matchinggame')}><i className="fas fa-puzzle-piece"></i> <span>Matching Game</span></li>
                    <li onClick={() => navigate('/timeattack')}><i className="fas fa-stopwatch"></i> <span>Time Attack</span></li>
                    <li onClick={() => navigate('/achievements')}><i className="fas fa-trophy"></i> <span>Achievements</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="main-container" style={{ position: 'relative', zIndex: 1 }}>
                {!puzzleActive && (
                <section className="controls-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div className={`search-container ${isExpandedTable ? 'expanded-mode' : ''}`} style={{ marginBottom: 0 }}>
                            <i className="fas fa-search search-icon"></i>
                            <input type="text" value={searchTerm} onChange={handleSearchChange} className="search-input" placeholder="Search by name or symbol..." />
                            {searchTerm && <i className="fas fa-times clear-search-icon" style={{ display: 'block' }} onClick={() => setSearchTerm('')} title="Clear Search"></i>}
                        </div>
                        <button
                            onClick={openPuzzleSetup}
                            style={{ background: 'linear-gradient(135deg, #6e45e2, #8e44ad)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(110,69,226,0.3)', fontSize: '0.95rem', flexShrink: 0, marginLeft: '12px' }}
                        >
                            <i className="fas fa-puzzle-piece"></i> Play Periodic Puzzle
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {reviewElements.length > 0 && (
                                <button 
                                    className="learn-filter-btn" 
                                    style={{ background: '#6e45e2', color: 'white', borderColor: '#6e45e2' }}
                                    onClick={() => setReviewElements([])}
                                >
                                    <i className="fas fa-times-circle"></i> Clear Review
                                </button>
                            )}
                            <div className="learn-filters" style={{ display: 'flex', gap: '10px' }}>
                                <button className={`learn-filter-btn ${learningFilter === 'learned' ? 'active-learned' : ''}`} onClick={() => handleLearningFilterClick('learned')}><i className="fas fa-check-circle"></i> Learned</button>
                                <button className={`learn-filter-btn ${learningFilter === 'not-learned' ? 'active-not-learned' : ''}`} onClick={() => handleLearningFilterClick('not-learned')}><i className="fas fa-circle"></i> Not Yet Learned</button>
                            </div>
                            <div className="learned-counter"><i className="fas fa-star" style={{ color: '#f1c40f' }}></i> Learned: <span>{learnedElements.size}</span>/118</div>
                        </div>
                    </div>
                    <div className="filter-group">
                        {filterCategories.map(cat => (
                            <button key={cat} className={`filter-btn ${activeCategory === cat ? 'active' : ''}`} data-category={cat} onClick={() => handleCategoryClick(cat)}>
                                {cat.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </section>
                )}

                {!puzzleActive && (
                <div className="table-header-mobile">
                    <h3 style={{ color: '#2d3436', margin: 0 }}><i className="fas fa-th"></i> Periodic Table</h3>
                    <button className="btn-expand-table" onClick={() => setIsExpandedTable(true)}>
                        <i className="fas fa-expand-arrows-alt"></i> Full Screen
                    </button>
                </div>
                )}

                {isExpandedTable && (
                    <button className="btn-close-expand" onClick={() => setIsExpandedTable(false)}>
                        <i className="fas fa-compress-arrows-alt"></i> Close
                    </button>
                )}

                {!puzzleActive && (
                    <div className={`table-wrapper ${isExpandedTable ? 'expanded' : ''}`}>
                        <section className="table-grid">
                            {Object.entries(elementData).map(([symbol, el]) => {
                                const { opacity, highlighted } = getTileStyle(symbol, el.cat);
                                return (
                                    <div key={symbol} className={`element-tile ${el.cat} ${highlighted ? 'highlighted' : ''}`} style={{ gridColumn: el.x, gridRow: el.y, opacity }} onClick={() => openModal(symbol)}>
                                        <span className="atomic-number">{el.n}</span>
                                        <span className="symbol">{symbol}</span>
                                        <span className="name">{el.name}</span>
                                    </div>
                                );
                            })}
                        </section>
                    </div>
                )}
            </main>

            {/* ── Periodic Puzzle: dedicated full-screen game container ──
                 Uses the real browser Fullscreen API (see confirmStartPuzzle),
                 not the CSS .table-wrapper.expanded overlay used for normal
                 browsing — kept fully separate so the two never interfere. */}
            {puzzleActive && (
                <div ref={puzzleContainerRef} className="puzzle-fullscreen">
                    <div className="puzzle-fs-header">
                        <span className="puzzle-fs-title"><i className="fas fa-puzzle-piece"></i> Periodic Puzzle — {puzzleCategory === 'all' ? 'All Elements' : puzzleCategory.replace('-', ' ')}</span>
                        <span className="puzzle-fs-progress">{puzzleTray.length} remaining</span>
                        <span className={`puzzle-fs-lives ${(puzzleWrongLimits[puzzleCategory] ?? 5) - puzzleWrongCount <= 1 ? 'puzzle-fs-lives-low' : ''}`}>
                            <i className="fas fa-heart"></i> {Math.max(0, (puzzleWrongLimits[puzzleCategory] ?? 5) - puzzleWrongCount)} mistakes left
                        </span>
                        <button className="puzzle-exit-btn" onClick={exitPuzzleGame}>
                            <i className="fas fa-times"></i> Exit
                        </button>
                    </div>

                    {/* Transient toast shown the moment a wrong symbol is placed —
                        separate from the persistent header badge, since a toast at
                        the moment of the mistake is more attention-grabbing than a
                        number quietly ticking down in the corner. */}
                    {puzzleMistakeToast && (
                        <div className="puzzle-mistake-toast" key={puzzleMistakeToast.key}>
                            <i className="fas fa-exclamation-circle"></i>
                            Not quite — {puzzleMistakeToast.remaining} mistake{puzzleMistakeToast.remaining !== 1 ? 's' : ''} left
                        </div>
                    )}

                    <div className="puzzle-grid-wrapper">
                    <section className="puzzle-grid">
                        {Object.entries(elementData).map(([symbol, el]) => {
                            const inThisCategory = puzzleCategory === 'all' || el.cat === puzzleCategory;
                            const isPlaced = !!puzzlePlaced[symbol];
                            const isWrongFlash = puzzleWrongTile === symbol;

                            if (!inThisCategory) {
                                // Tiles outside the chosen category stay visible but inert and dimmed,
                                // so the student still sees the whole table's shape for context.
                                return (
                                    <div key={symbol} className={`element-tile ${el.cat}`} style={{ gridColumn: el.x, gridRow: el.y, opacity: 0.25, cursor: 'default' }}>
                                        <span className="atomic-number">{el.n}</span>
                                        <span className="symbol">{symbol}</span>
                                        <span className="name">{el.name}</span>
                                    </div>
                                );
                            }

                            const isSelected = selectedTileSymbol === symbol;

                            return (
                                <div
                                    key={symbol}
                                    className={`element-tile puzzle-tile ${isPlaced ? el.cat + ' puzzle-solved' : 'puzzle-blank'} ${isWrongFlash ? 'puzzle-wrong-flash' : ''} ${isSelected ? 'puzzle-selected' : ''}`}
                                    style={{ gridColumn: el.x, gridRow: el.y }}
                                    onClick={() => { if (!isPlaced) selectPuzzleTile(symbol); }}
                                >
                                    {isPlaced && (
                                        <>
                                            <span className="atomic-number">{el.n}</span>
                                            <span className="symbol">{symbol}</span>
                                            <span className="name">{el.name}</span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                    </div>

                    {/* Rendered INSIDE the fullscreen element on purpose: when using the
                        native Fullscreen API, only descendants of the fullscreen element
                        are painted on screen — a sibling modal (even with position:fixed
                        and a high z-index) would be invisible while fullscreen is active. */}
                    {elementInfoModal}

                    {/* ── Question Modal: tapping a blank tile opens this instead of
                         filtering an inline tray. Shows the hint automatically plus
                         the category's option chips to pick from. ── */}
                    {selectedTileSymbol && (
                        <div className="modal-container show" style={{ zIndex: 10002 }} onClick={() => setSelectedTileSymbol(null)}>
                            <div className="modal-content puzzle-question-modal" onClick={e => e.stopPropagation()}>
                                <button className="close-modal" onClick={() => setSelectedTileSymbol(null)}>&times;</button>
                                <div className="puzzle-question-modal-icon"><i className="fas fa-question"></i></div>
                                <h2>Which element belongs here?</h2>
                                <div className="puzzle-hint-modal-meta">
                                    <span><i className="fas fa-tag"></i> {categoryLabels[elementData[selectedTileSymbol].cat] || elementData[selectedTileSymbol].cat}</span>
                                    <span><i className="fas fa-hashtag"></i> Atomic No. {elementData[selectedTileSymbol].n}</span>
                                </div>
                                <div className="puzzle-question-hint">
                                    <i className="fas fa-lightbulb"></i>
                                    <p>{puzzleHints[selectedTileSymbol]}</p>
                                </div>
                                <div className="puzzle-question-options">
                                    {puzzleModalOptions.map(symbol => (
                                        <button
                                            key={symbol}
                                            className="puzzle-tray-chip"
                                            onClick={() => attemptPlacement(symbol)}
                                        >
                                            {symbol}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Success Modal: replaces the old full element-info modal for
                         puzzle correct-answers. Shows just enough — name, symbol, the
                         hint that was given, and an image — plus a Next button to continue,
                         rather than the full multi-section info modal used elsewhere. ── */}
                    {puzzleSuccessSymbol && (() => {
                        const el = elementData[puzzleSuccessSymbol];
                        return (
                            <div className="modal-container show" style={{ zIndex: 10002 }}>
                                <div className="modal-content puzzle-success-modal">
                                    <div className="puzzle-success-modal-icon"><i className="fas fa-check"></i></div>
                                    <h2>Correct!</h2>
                                    <div className="puzzle-success-modal-symbol">{puzzleSuccessSymbol}</div>
                                    <p className="puzzle-success-modal-name">{el.name}</p>
                                    <div className="puzzle-success-modal-image">
                                        <img
                                            src={`/assets/elements/${el.name.toLowerCase()}.jpg`}
                                            alt={el.name}
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                                        />
                                        <span className="puzzle-success-modal-image-fallback"><i className="fas fa-image"></i></span>
                                    </div>
                                    <div className="puzzle-question-hint">
                                        <i className="fas fa-lightbulb"></i>
                                        <p>{puzzleHints[puzzleSuccessSymbol]}</p>
                                    </div>
                                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={proceedFromSuccess}>
                                        Next <i className="fas fa-arrow-right"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {puzzleComplete && (
                        <div className="modal-container show" style={{ zIndex: 10003 }}>
                            <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🎉</div>
                                <h2 style={{ color: '#2d3436', marginBottom: '8px' }}>Puzzle Complete!</h2>
                                <p style={{ color: '#666', marginBottom: '25px' }}>You correctly placed every element in <strong>{puzzleCategory === 'all' ? 'the full table' : puzzleCategory.replace('-', ' ')}</strong>!</p>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button className="btn-cancel" onClick={exitPuzzleGame}>Exit</button>
                                    <button className="btn-primary" onClick={() => { setPuzzleComplete(false); setPuzzleActive(false); if (document.fullscreenElement) document.exitFullscreen().catch(e => console.warn(e)); setShowPuzzleSetup(true); }}>Play Another Category</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {puzzleGameOver && (
                        <div className="modal-container show" style={{ zIndex: 10003 }}>
                            <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>😵</div>
                                <h2 style={{ color: '#2d3436', marginBottom: '8px' }}>Game Over</h2>
                                <p style={{ color: '#666', marginBottom: '25px' }}>
                                    You've reached the limit of <strong>{puzzleWrongLimits[puzzleCategory] ?? 5} wrong placements</strong> for{' '}
                                    <strong>{puzzleCategory === 'all' ? 'the full table' : puzzleCategory.replace('-', ' ')}</strong>. Give it another go!
                                </p>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button className="btn-cancel" onClick={exitPuzzleGame}>Exit</button>
                                    <button className="btn-primary" onClick={() => startPuzzleGame(puzzleCategory)}>Try Again</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}



            {!puzzleActive && elementInfoModal}

            {showDesktopAr && (
                <div className="modal-container show" style={{ zIndex: 10001 }}>
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 30px' }}>
                        <i className="fas fa-mobile-alt" style={{ fontSize: '3.5rem', color: '#4facfe', marginBottom: '15px' }}></i>
                        <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>View in AR</h2>
                        <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.5' }}>Scan the QR code with your mobile device's camera to view <strong>{selectedElement?.name}</strong> in Augmented Reality!</p>
                        <img src={qrUrl} alt="QR Code" style={{ marginBottom: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowDesktopAr(false)}>Got it</button>
                    </div>
                </div>
            )}

            {/* ── Periodic Puzzle: Category Setup ── */}
            {/* ── Periodic Puzzle: Instructions (shown first) ── */}
            {showPuzzleInstructions && (
                <div className="modal-container show" style={{ zIndex: 10002 }} onClick={() => setShowPuzzleInstructions(false)}>
                    <div className="modal-content" style={{ maxWidth: '460px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <i className="fas fa-puzzle-piece" style={{ fontSize: '2.8rem', color: '#6e45e2', marginBottom: '10px' }}></i>
                        <h2 style={{ color: '#2d3436', marginBottom: '15px' }}>How to Play</h2>
                        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            <p style={{ color: '#555', margin: 0 }}><i className="fas fa-th" style={{ color: '#6e45e2', width: '20px' }}></i> The table turns <strong>black &amp; white</strong> with blank tiles for this category.</p>
                            <p style={{ color: '#555', margin: 0 }}><i className="fas fa-hand-pointer" style={{ color: '#6e45e2', width: '20px' }}></i> <strong>Tap a blank tile</strong> — a popup shows a hint and the possible element symbols to choose from.</p>
                            <p style={{ color: '#555', margin: 0 }}><i className="fas fa-check-circle" style={{ color: '#1dd1a1', width: '20px' }}></i> <strong>Correct!</strong> A popup shows the element's name, picture, and the hint, with a Next button to continue.</p>
                            <p style={{ color: '#555', margin: 0 }}><i className="fas fa-times-circle" style={{ color: '#e74c3c', width: '20px' }}></i> <strong>Wrong?</strong> A notification shows how many mistakes you have left — try again from the same popup.</p>
                            <p style={{ color: '#555', margin: 0 }}><i className="fas fa-heart" style={{ color: '#e74c3c', width: '20px' }}></i> Each category has a <strong>limited number of mistakes</strong> — run out, and it's game over!</p>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={proceedToCategorySelect}>Choose a Category</button>
                    </div>
                </div>
            )}

            {/* ── Periodic Puzzle: Category Setup (shown after instructions) ── */}
            {showPuzzleSetup && (
                <div className="modal-container show" style={{ zIndex: 10002 }} onClick={() => setShowPuzzleSetup(false)}>
                    <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <i className="fas fa-puzzle-piece" style={{ fontSize: '2.8rem', color: '#6e45e2', marginBottom: '10px' }}></i>
                        <h2 style={{ color: '#2d3436', marginBottom: '6px' }}>Choose a Category</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Smaller categories are quicker — great for a first try!</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                            {filterCategories.map(cat => {
                                const count = getPuzzleElementSymbols(cat).length;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => startPuzzleGame(cat)}
                                        style={{ background: '#f8f9fa', border: '1px solid #e1e1e1', borderRadius: '12px', padding: '12px 10px', cursor: 'pointer', fontWeight: '700', color: '#2d3436', textTransform: 'capitalize', fontSize: '0.9rem' }}
                                    >
                                        {cat.replace('-', ' ')}
                                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#888', fontWeight: '500', marginTop: '2px' }}>{count} element{count !== 1 ? 's' : ''}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button className="btn-cancel" style={{ width: '100%' }} onClick={() => setShowPuzzleSetup(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* ── Periodic Puzzle: Completion ── */}
        </div>
    );
}