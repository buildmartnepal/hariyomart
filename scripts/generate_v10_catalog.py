import json, hashlib, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps/web/server/data/catalog.json'

provinces=[
 {'slug':'koshi','name':'Koshi Province','description':'Tea, large cardamom, ginger, citrus, vegetables and eastern hill specialties','district':'Ilam','specialty':'Tea, cardamom & citrus'},
 {'slug':'madhesh','name':'Madhesh Province','description':'Mango, litchi, grains, pulses, vegetables, oilseeds and tropical produce','district':'Dhanusha','specialty':'Tropical fruit & field crops'},
 {'slug':'bagmati','name':'Bagmati Province','description':'Fresh vegetables, mushrooms, citrus, herbs, dairy and aggregation for Kathmandu Valley','district':'Kathmandu','specialty':'Fresh produce & city supply'},
 {'slug':'gandaki','name':'Gandaki Province','description':'Mustang fruit, Syangja citrus, coffee, honey, beans and mountain specialties','district':'Kaski','specialty':'Fruit, coffee & mountain foods'},
 {'slug':'lumbini','name':'Lumbini Province','description':'Grains, lentils, mustard, vegetables, honey and processed foods','district':'Rupandehi','specialty':'Grains, pulses & oils'},
 {'slug':'karnali','name':'Karnali Province','description':'Jumla rice, apples, walnuts, beans, buckwheat and high-altitude botanicals','district':'Jumla','specialty':'High-altitude heritage crops'},
 {'slug':'sudurpashchim','name':'Sudurpashchim Province','description':'Millets, citrus, honey, oilseeds, herbs and western hill produce','district':'Kailali','specialty':'Millets, herbs & honey'},
]

clusters={
'ilam-highlands':('koshi','Ilam','Suryodaya','Ilam Highlands Producer Network',26.9115,88.0495,'1200–2200 m'),
'taplejung-hills':('koshi','Taplejung','Phungling','Taplejung Mountain Growers',27.35,87.67,'900–2400 m'),
'dhankuta-citrus':('koshi','Dhankuta','Pakhribas','Dhankuta Citrus & Spice Collective',27.05,87.29,'700–1900 m'),
'morang-terai':('koshi','Morang','Biratnagar','Morang Fresh Produce Hub',26.45,87.27,'60–500 m'),
'dhanusha-janakpur':('madhesh','Dhanusha','Janakpurdham','Janakpur Natural Growers',26.7271,85.9407,'70–300 m'),
'sarlahi-farms':('madhesh','Sarlahi','Malangawa','Sarlahi Farm & Fruit Network',26.86,85.56,'60–300 m'),
'bara-parsa':('madhesh','Bara','Kalaiya','Bara Parsa Produce Hub',27.0,84.88,'70–400 m'),
'siraha-saptari':('madhesh','Siraha','Lahan','Eastern Terai Pulse & Produce Collective',26.72,86.49,'60–300 m'),
'kavre-hills':('bagmati','Kavrepalanchok','Banepa','Kavre Hill Farm Network',27.63,85.52,'900–1800 m'),
'chitwan-valley':('bagmati','Chitwan','Bharatpur','Chitwan Valley Producers',27.68,84.43,'150–900 m'),
'makwanpur-hills':('bagmati','Makwanpur','Hetauda','Makwanpur Fresh & Herb Network',27.43,85.03,'400–1800 m'),
'nuwakot-rasuwa':('bagmati','Nuwakot','Bidur','Nuwakot Rasuwa Mountain Foods',27.91,85.16,'700–2400 m'),
'kaski-pokhara':('gandaki','Kaski','Pokhara','Pokhara Hillside Growers',28.2096,83.9856,'700–1800 m'),
'syangja-hills':('gandaki','Syangja','Putalibazar','Syangja Citrus & Coffee Network',28.10,83.87,'700–1700 m'),
'mustang-orchards':('gandaki','Mustang','Jomsom','Mustang Orchard & Mountain Foods',28.78,83.73,'2200–3200 m'),
'lamjung-gorkha':('gandaki','Lamjung','Besisahar','Lamjung Gorkha Farm Collective',28.23,84.38,'700–2200 m'),
'rupandehi-butwal':('lumbini','Rupandehi','Butwal','Rupandehi Green Basket',27.7006,83.4484,'100–700 m'),
'palpa-hills':('lumbini','Palpa','Tansen','Palpa Hill Coffee & Spice Collective',27.87,83.55,'800–1700 m'),
'dang-valley':('lumbini','Dang','Ghorahi','Dang Valley Grain & Herb Network',28.04,82.49,'500–1200 m'),
'bardiya-bank':('lumbini','Bardiya','Gulariya','Western Terai Honey & Oilseed Hub',28.21,81.33,'140–600 m'),
'jumla-highlands':('karnali','Jumla','Chandannath','Jumla Heritage Harvest',29.2747,82.1838,'2200–3200 m'),
'mugu-highlands':('karnali','Mugu','Gamgadhi','Mugu Mountain Produce Network',29.54,82.14,'2200–3300 m'),
'surkhet-valley':('karnali','Surkhet','Birendranagar','Surkhet Valley Producers',28.60,81.63,'500–1400 m'),
'salyan-rukum':('karnali','Salyan','Khalanga','Salyan Rukum Herb & Grain Collective',28.38,82.17,'900–2400 m'),
'kailali-dhangadhi':('sudurpashchim','Kailali','Dhangadhi','Dhangadhi Natural Produce',28.695,80.5938,'100–800 m'),
'kanchanpur-mahendranagar':('sudurpashchim','Kanchanpur','Bhimdatta','Kanchanpur Farm & Honey Network',28.96,80.18,'100–900 m'),
'dadeldhura-hills':('sudurpashchim','Dadeldhura','Amargadhi','Dadeldhura Hill Producers',29.30,80.58,'1200–2400 m'),
'baitadi-darchula':('sudurpashchim','Baitadi','Dasharathchand','Far-West Mountain Foods Collective',29.56,80.42,'1400–3000 m'),
}

categories=[
 ('fresh-fruits','Fresh Fruits','Orchard and tropical fruits sourced by season from Nepal growing clusters','🍎'),
 ('vegetables','Vegetables','Farm vegetables for households, hospitality, retail and institutional supply','🥦'),
 ('leafy-greens','Leafy Greens','Fast-moving greens and culinary leaves for nearby city fulfilment','🥬'),
 ('herbs-spices','Herbs & Spices','Whole and processed culinary herbs, roots and spices with Nepal origin profiles','🌿'),
 ('medicinal-herbs','Medicinal & Wellness Herbs','Cultivated and responsibly sourced botanicals offered subject to lot-level compliance','🌱'),
 ('dried-botanicals','Dried Botanicals','Dried leaves, flowers, peels and roots for tea, food and ingredient buyers','🍃'),
 ('essential-oils','Essential Oils','Nepal-produced aromatic oils and extracts for qualified trade inquiries','🧴'),
 ('tea-coffee','Tea & Coffee','Orthodox tea, herbal infusions and specialty hill coffee','🍵'),
 ('honey','Honey','Traceable honey profiles from hill, forest-edge and agricultural landscapes','🍯'),
 ('grains','Grains & Heritage Cereals','Rice, millets, maize, barley and buckwheat including mountain staples','🌾'),
 ('lentils-beans','Lentils & Beans','Pulses and beans for retail, food service and bulk buyers','🫘'),
 ('dry-fruits','Nuts, Seeds & Dried Fruit','Walnuts, seeds and dried fruit for pantry and ingredient supply','🌰'),
 ('oils','Natural Oils & Butters','Cold-pressed edible oils and plant-based fats from local processors','🫙'),
 ('pickles','Pickles & Ferments','Traditional achar, fermented greens and shelf-stable Nepal flavours','🥒'),
 ('juices','Juices & Fruit Products','Juices, squashes and fruit preparations from local processors','🧃'),
 ('flour-baking','Flour & Baking','Stoneground and milled local grains for household and institutional use','🥣'),
 ('mushrooms','Mushrooms','Fresh and dried cultivated mushrooms from controlled farms','🍄'),
 ('dairy','Dairy & Chhurpi','Local dairy staples and Himalayan-style chhurpi products','🥛'),
 ('natural-care','Natural Care','Farm-origin soaps, balms and botanical personal-care products','🧼'),
 ('specialty-foods','Nepal Specialty Foods','Distinctive local pantry products for gifting, retail and trade','🏔️'),
 ('seedlings-plants','Seedlings & Plants','Nursery stock and planting material for farms and home growers','🌱'),
 ('flowers','Flowers','Fresh flowers, garlands and seasonal floriculture products','🌼'),
 ('farm-boxes','Farm & Trade Boxes','Curated mixed boxes for households, chefs, samples and buyer discovery','🧺'),
]
categories=[{'slug':s,'name':n,'description':d,'emoji':e} for s,n,d,e in categories]

items={
'fresh-fruits': ['Mustang apple','Jumla apple','Karnali dried-season apple fresh grade','Ilam kiwi','Kavre kiwi','Sindhuli junar sweet orange','Dhankuta mandarin','Syangja orange','Nepal hill lemon','Nepal kagati lime','Terai mango','Malbhog banana','Litchi','Guava','Papaya','Pomegranate','Hill pear','Peach','Plum','Lapsi hog plum'],
'vegetables': ['Mountain potato','Red potato','Tomato','Cherry tomato','Cauliflower','Cabbage','Broccoli','Carrot','White radish','Turnip','Beetroot','Cucumber','Bitter gourd','Bottle gourd','Sponge gourd','Ridge gourd','Pumpkin','Zucchini','Brinjal eggplant','Okra','Green capsicum','Green peas','French beans','Cowpea pods','Red onion','Sweet potato'],
'leafy-greens': ['Rayo mustard greens','Spinach','Coriander leaves','Fenugreek greens','Mint leaves','Dill leaves','Amaranth greens','Lettuce','Kale','Watercress'],
'herbs-spices': ['Large cardamom','Fresh ginger','Dried ginger','Turmeric fingers','Turmeric powder','Timur Sichuan pepper','Whole dried chilli','Chilli flakes','Garlic','Coriander seed','Cumin seed','Fenugreek seed','Mustard seed','Bay leaf tejpat','Cinnamon leaf','Black pepper','Lemongrass culinary cut','Dried mint'],
'medicinal-herbs': ['Tulsi holy basil','Nettle sisnu leaf','Moringa leaf','Chamomile flower','Calendula flower','Aloe vera leaf','Brahmi herb','Guduchi giloy stem','Ashwagandha root cultivated','Shatavari root cultivated','Stevia leaf','Rosemary herb'],
'dried-botanicals': ['Dried rhododendron petals','Dried orange peel','Dried lemon peel','Dried ginger slices','Dried turmeric slices','Dried nettle leaf','Dried tulsi leaf','Dried lemongrass','Dried mint leaf','Dried rosemary leaf'],
'essential-oils': ['Lemongrass essential oil','Citronella essential oil','Palmarosa essential oil','Wintergreen essential oil','Eucalyptus essential oil','Peppermint essential oil','Rosemary essential oil','Turmeric essential oil'],
'tea-coffee': ['Ilam orthodox black tea','Ilam green tea','Ilam white tea','Ilam golden tips tea','Ilam silver tips tea','Nepal oolong tea','High-hill breakfast tea','Masala tea blend','Tulsi herbal infusion','Lemongrass herbal infusion','Nettle herbal infusion','Chamomile herbal infusion','Gulmi specialty coffee','Palpa specialty coffee','Syangja specialty coffee','Kavre specialty coffee'],
'honey': ['Hill wildflower honey','Mustard blossom honey','Chiuri blossom honey','Litchi blossom honey','Buckwheat honey','Forest-edge multifloral honey','High-hill honey'],
'grains': ['Jumla Marshi red rice','Jethobudho aromatic rice','Anadi sticky rice','Finger millet kodo','Foxtail millet kaguno','Proso millet chino','Sweet buckwheat mithe phapar','Bitter buckwheat tite phapar','Highland barley','White maize','Red maize'],
'lentils-beans': ['Red lentil masoor','Black gram maas','Green gram mung','Pigeon pea rahar','Chickpea chana','Jumla rajma','Jumla black bean','Soybean bhatmas','Cowpea black-eyed bean','Horse gram gahat','Rice bean masyang','Field pea','White kidney bean'],
'dry-fruits': ['Jumla walnut','Mustang walnut','Dried Mustang apple','Dried Jumla apple','Dried apricot','Dried lapsi','Pumpkin seed','Sesame seed'],
'oils': ['Cold-pressed mustard oil','Cold-pressed sesame oil','Cold-pressed flaxseed oil','Walnut oil','Apricot kernel oil','Chiuri plant butter'],
'pickles': ['Lapsi achar','Timur tomato achar','Radish achar','Bamboo shoot tama pickle','Lemon pickle','Mixed vegetable achar'],
'juices': ['Lapsi fruit squash','Rhododendron drink concentrate','Sea buckthorn juice','Apple juice','Junar orange juice','Bel fruit drink'],
'flour-baking': ['Finger millet flour','Buckwheat flour','Maize flour','Barley flour','Rice flour','Roasted soybean flour'],
'mushrooms': ['Oyster mushroom','Button mushroom','Shiitake mushroom','Dried shiitake mushroom'],
'dairy': ['Cow ghee','Buffalo ghee','Fresh paneer','Hard chhurpi'],
'natural-care': ['Honey botanical soap','Turmeric botanical soap','Nettle shampoo bar','Mustard herbal hair oil','Beeswax herbal balm'],
'specialty-foods': ['Gundruk fermented greens','Sinki fermented radish','Roasted soybean bhatmas snack','Chiura beaten rice','Tsampa roasted barley mix'],
'seedlings-plants': ['Large cardamom seedlings','Tea saplings','Coffee seedlings','Kiwi plants'],
'flowers': ['Marigold flowers','Rose flowers','Chrysanthemum flowers'],
'farm-boxes': ['Seasonal Nepal farm box','Chef discovery produce box'],
}
assert sum(len(v) for v in items.values())==210, sum(len(v) for v in items.values())

image_map={
'fresh-fruits':'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1200&q=82',
'vegetables':'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=82',
'leafy-greens':'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=1200&q=82',
'herbs-spices':'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=82',
'medicinal-herbs':'https://images.unsplash.com/photo-1515586000433-45406d8e6662?auto=format&fit=crop&w=1200&q=82',
'dried-botanicals':'https://images.unsplash.com/photo-1531983412531-1f49a365ffed?auto=format&fit=crop&w=1200&q=82',
'essential-oils':'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=82',
'tea-coffee':'https://images.unsplash.com/photo-1521012012373-6a85bade18da?auto=format&fit=crop&w=1200&q=82',
'honey':'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=82',
'grains':'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1200&q=82',
'lentils-beans':'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=1200&q=82',
'dry-fruits':'https://images.unsplash.com/photo-1600189020840-e9918c25269d?auto=format&fit=crop&w=1200&q=82',
'oils':'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1200&q=82',
'pickles':'https://images.unsplash.com/photo-1589621316382-008455b857cd?auto=format&fit=crop&w=1200&q=82',
'juices':'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=1200&q=82',
'flour-baking':'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=82',
'mushrooms':'https://images.unsplash.com/photo-1504545102780-26774c1bb073?auto=format&fit=crop&w=1200&q=82',
'dairy':'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=82',
'natural-care':'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=1200&q=82',
'specialty-foods':'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=82',
'seedlings-plants':'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=82',
'flowers':'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=82',
'farm-boxes':'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=82',
}

category_meta={
'fresh-fruits':('0800 family','Fresh graded; pre-cooled where required',14,'Cool chain where appropriate; handle gently',['Kathmandu','Pokhara','Biratnagar','Butwal']),
'vegetables':('0709 family','Fresh graded; washed only where product protocol allows',10,'Cool, ventilated storage; cold chain for sensitive lines',['Kathmandu','Pokhara','Bharatpur','Biratnagar']),
'leafy-greens':('0709 family','Same-day harvest and field grading',5,'2–8°C cold chain',['Kathmandu','Pokhara','Butwal']),
'herbs-spices':('0900 family','Cleaned, graded; dried or milled where stated',365,'Cool, dry, food-grade storage',['Kathmandu','Birgunj','Biratnagar','Pokhara']),
'medicinal-herbs':('1211.90 hint','Cleaned and dried as specified; botanical identity reconfirmed per lot',365,'Dry, shaded storage in sealed food/ingredient-grade pack',['Kathmandu','Export desk']),
'dried-botanicals':('1211/0813 hint','Cleaned and dehydrated to supplier specification',365,'Cool, dry, sealed packaging',['Kathmandu','Export desk']),
'essential-oils':('3301 family','Steam-distilled or supplier-declared extraction method; COA requested per lot',730,'Cool, dark, sealed approved container',['Kathmandu','Export desk']),
'tea-coffee':('0901/0902 family','Made tea or roasted/green coffee as specified',540,'Cool, dry, odour-free sealed packaging',['Kathmandu','Pokhara','Export desk']),
'honey':('0409.00 hint','Filtered/settled according to producer protocol; no certification implied',730,'Cool, dry; protect from direct heat',['Kathmandu','Pokhara','Export desk']),
'grains':('1000 family','Cleaned, graded and moisture-managed',365,'Dry, ventilated, pest-controlled storage',['Kathmandu','Butwal','Nepalgunj']),
'lentils-beans':('0713 family','Cleaned, graded and bagged',365,'Dry, ventilated, pest-controlled storage',['Kathmandu','Birgunj','Nepalgunj']),
'dry-fruits':('0802/0813 family','Cleaned, dried and graded',365,'Cool, dry, sealed packaging',['Kathmandu','Pokhara','Export desk']),
'oils':('1500 family','Cold-pressed or processor-declared extraction',365,'Cool, dark storage; food-grade container',['Kathmandu','Pokhara','Export desk']),
'pickles':('2001 family','Prepared by registered/local processor recipe; batch/date tracked',270,'Follow label storage and refrigeration after opening',['Kathmandu','Pokhara','Export desk']),
'juices':('2009 family','Juiced/processed and packed by local producer',180,'Follow label storage; cold chain for unpasteurised batches',['Kathmandu','Pokhara','Export desk']),
'flour-baking':('1100 family','Milled and packed in food-grade bags',180,'Cool, dry, pest-controlled storage',['Kathmandu','Pokhara','Butwal']),
'mushrooms':('0709/0712 family','Fresh graded or dried as stated',7,'2–8°C for fresh; dry sealed storage for dried',['Kathmandu','Pokhara']),
'dairy':('0400 family','Dairy processor/farm production with batch handling',30,'Cold chain unless shelf-stable product',['Kathmandu','Pokhara']),
'natural-care':('3304/3401 hint','Small-batch processor formulation; ingredient and cosmetic compliance checked per destination',540,'Cool, dry, protected from direct sunlight',['Kathmandu','Export desk']),
'specialty-foods':('1900/2000 hint','Traditional/local processing with batch and ingredient records',270,'Product-specific sealed storage',['Kathmandu','Pokhara','Export desk']),
'seedlings-plants':('0602 hint','Nursery-grown planting material',30,'Live plant handling; destination plant-health rules apply',['Nepal farms']),
'flowers':('0603 hint','Fresh cut and graded',7,'Hydrated cold handling',['Kathmandu','Pokhara']),
'farm-boxes':('Mixed','Curated and packed by seller cluster',7,'Product-specific handling',['Kathmandu','Pokhara']),
}

# exact HS hints for products explicitly listed by Nepal TEPC or common headings
hs_exact={
'Large cardamom':'0908.30','Fresh ginger':'0910.10','Dried ginger':'0910.10','Turmeric fingers':'0910.30','Turmeric powder':'0910.30',
'Red lentil masoor':'0713.40','Natural honey':'0409.00','Ilam orthodox black tea':'0902.30','Ilam green tea':'0902','Ilam white tea':'0902',
'Gulmi specialty coffee':'0901.11 hint','Palpa specialty coffee':'0901.11 hint','Syangja specialty coffee':'0901.11 hint','Kavre specialty coffee':'0901.11 hint',
'Mountain potato':'0701.90','Red potato':'0701.90','Red onion':'0703.10','Garlic':'0703.20','Junar orange juice':'2009.19 hint',
'Nepal hill lemon':'0805.30','Nepal kagati lime':'0805.30','Terai mango':'0804.50','Guava':'0804.50','Sindhuli junar sweet orange':'0805.10','Dhankuta mandarin':'0805.10','Syangja orange':'0805.10',
}

botanical={
'Large cardamom':'Amomum subulatum','Fresh ginger':'Zingiber officinale','Dried ginger':'Zingiber officinale','Turmeric fingers':'Curcuma longa','Turmeric powder':'Curcuma longa','Timur Sichuan pepper':'Zanthoxylum armatum','Tulsi holy basil':'Ocimum tenuiflorum','Nettle sisnu leaf':'Urtica dioica complex','Moringa leaf':'Moringa oleifera','Chamomile flower':'Matricaria chamomilla','Calendula flower':'Calendula officinalis','Aloe vera leaf':'Aloe vera','Brahmi herb':'Bacopa monnieri','Guduchi giloy stem':'Tinospora cordifolia','Ashwagandha root cultivated':'Withania somnifera','Shatavari root cultivated':'Asparagus racemosus','Stevia leaf':'Stevia rebaudiana','Rosemary herb':'Salvia rosmarinus','Lemongrass essential oil':'Cymbopogon spp.','Citronella essential oil':'Cymbopogon spp.','Palmarosa essential oil':'Cymbopogon martinii','Wintergreen essential oil':'Gaultheria fragrantissima','Peppermint essential oil':'Mentha × piperita','Rosemary essential oil':'Salvia rosmarinus','Turmeric essential oil':'Curcuma longa','Ilam orthodox black tea':'Camellia sinensis','Ilam green tea':'Camellia sinensis','Ilam white tea':'Camellia sinensis','Ilam golden tips tea':'Camellia sinensis','Ilam silver tips tea':'Camellia sinensis','Nepal oolong tea':'Camellia sinensis','High-hill breakfast tea':'Camellia sinensis','Gulmi specialty coffee':'Coffea arabica','Palpa specialty coffee':'Coffea arabica','Syangja specialty coffee':'Coffea arabica','Kavre specialty coffee':'Coffea arabica',
}

preferred={
'Mustang apple':'mustang-orchards','Jumla apple':'jumla-highlands','Karnali dried-season apple fresh grade':'mugu-highlands','Ilam kiwi':'ilam-highlands','Kavre kiwi':'kavre-hills','Sindhuli junar sweet orange':'makwanpur-hills','Dhankuta mandarin':'dhankuta-citrus','Syangja orange':'syangja-hills','Ilam orthodox black tea':'ilam-highlands','Ilam green tea':'ilam-highlands','Ilam white tea':'ilam-highlands','Ilam golden tips tea':'ilam-highlands','Ilam silver tips tea':'ilam-highlands','Nepal oolong tea':'ilam-highlands','High-hill breakfast tea':'ilam-highlands','Large cardamom':'taplejung-hills','Fresh ginger':'ilam-highlands','Dried ginger':'ilam-highlands','Timur Sichuan pepper':'salyan-rukum','Jumla Marshi red rice':'jumla-highlands','Jumla rajma':'jumla-highlands','Jumla black bean':'jumla-highlands','Jumla walnut':'jumla-highlands','Mustang walnut':'mustang-orchards','Dried Mustang apple':'mustang-orchards','Dried Jumla apple':'jumla-highlands','Gulmi specialty coffee':'palpa-hills','Palpa specialty coffee':'palpa-hills','Syangja specialty coffee':'syangja-hills','Kavre specialty coffee':'kavre-hills','Rhododendron drink concentrate':'dadeldhura-hills','Sea buckthorn juice':'mustang-orchards','Hard chhurpi':'ilam-highlands','Lapsi achar':'kavre-hills','Lapsi fruit squash':'kavre-hills','Dried lapsi':'kavre-hills','Chiuri blossom honey':'chitwan-valley','Mustard blossom honey':'bardiya-bank','Buckwheat honey':'jumla-highlands','Large cardamom seedlings':'ilam-highlands','Tea saplings':'ilam-highlands','Coffee seedlings':'palpa-hills','Kiwi plants':'kavre-hills',
}

category_clusters={
'fresh-fruits':['mustang-orchards','jumla-highlands','ilam-highlands','dhankuta-citrus','syangja-hills','sarlahi-farms','chitwan-valley'],
'vegetables':['kavre-hills','chitwan-valley','morang-terai','dhanusha-janakpur','rupandehi-butwal','kaski-pokhara','kailali-dhangadhi'],
'leafy-greens':['kavre-hills','kaski-pokhara','makwanpur-hills','rupandehi-butwal'],
'herbs-spices':['ilam-highlands','taplejung-hills','palpa-hills','salyan-rukum','dadeldhura-hills','dang-valley'],
'medicinal-herbs':['dadeldhura-hills','salyan-rukum','nuwakot-rasuwa','makwanpur-hills','ilam-highlands'],
'dried-botanicals':['dadeldhura-hills','salyan-rukum','ilam-highlands','kavre-hills'],
'essential-oils':['chitwan-valley','bardiya-bank','kailali-dhangadhi','ilam-highlands','makwanpur-hills'],
'tea-coffee':['ilam-highlands','palpa-hills','syangja-hills','kavre-hills'],
'honey':['chitwan-valley','bardiya-bank','jumla-highlands','ilam-highlands','kanchanpur-mahendranagar'],
'grains':['jumla-highlands','dang-valley','rupandehi-butwal','kailali-dhangadhi','lamjung-gorkha'],
'lentils-beans':['siraha-saptari','rupandehi-butwal','jumla-highlands','dang-valley','dhanusha-janakpur'],
'dry-fruits':['jumla-highlands','mustang-orchards','kavre-hills','bardiya-bank'],
'oils':['bardiya-bank','dang-valley','palpa-hills','kailali-dhangadhi'],
'pickles':['kavre-hills','kaski-pokhara','chitwan-valley','rupandehi-butwal'],
'juices':['kavre-hills','mustang-orchards','syangja-hills','makwanpur-hills'],
'flour-baking':['jumla-highlands','dang-valley','kailali-dhangadhi','lamjung-gorkha'],
'mushrooms':['kavre-hills','kaski-pokhara','chitwan-valley'],
'dairy':['ilam-highlands','kavre-hills','palpa-hills','kaski-pokhara'],
'natural-care':['chitwan-valley','ilam-highlands','kavre-hills','bardiya-bank'],
'specialty-foods':['kavre-hills','jumla-highlands','kaski-pokhara','dang-valley'],
'seedlings-plants':['ilam-highlands','kavre-hills','palpa-hills'],
'flowers':['kavre-hills','chitwan-valley','kaski-pokhara'],
'farm-boxes':['kavre-hills','kaski-pokhara'],
}

export_categories={'herbs-spices','medicinal-herbs','dried-botanicals','essential-oils','tea-coffee','honey','grains','lentils-beans','dry-fruits','oils','pickles','juices','flour-baking','natural-care','specialty-foods'}
seasonal_export_categories={'fresh-fruits','vegetables','mushrooms','flowers'}

def slugify(s):
    s=s.lower().replace('×','x')
    s=re.sub(r'[^a-z0-9]+','-',s).strip('-')
    return s

def stable_num(text, lo, hi):
    n=int(hashlib.sha256(text.encode()).hexdigest()[:8],16)
    return lo + n%(hi-lo+1)

def choose_cluster(name, cat, idx):
    if name in preferred: return preferred[name]
    arr=category_clusters[cat]
    return arr[idx%len(arr)]

def variant_meta(cat, trade):
    if cat in {'fresh-fruits','vegetables','leafy-greens','mushrooms'}:
        return ('10 kg trade crate' if trade else '1 kg city pack', 1 if not trade else 2)
    if cat in {'herbs-spices','medicinal-herbs','dried-botanicals'}:
        return ('10 kg food-grade trade bag' if trade else '250 g pouch', 1 if not trade else 2)
    if cat=='essential-oils': return ('1 L export canister' if trade else '30 ml amber bottle', 1 if not trade else 2)
    if cat=='tea-coffee': return ('5 kg foil-lined trade carton' if trade else '250 g pouch',1 if not trade else 2)
    if cat=='honey': return ('12 kg food-grade pail' if trade else '500 g jar',1 if not trade else 2)
    if cat in {'grains','lentils-beans','flour-baking'}: return ('25 kg trade bag' if trade else '2 kg bag',1 if not trade else 2)
    if cat=='dry-fruits': return ('10 kg trade carton' if trade else '500 g pouch',1 if not trade else 2)
    if cat=='oils': return ('5 L trade can' if trade else '1 L bottle',1 if not trade else 2)
    if cat=='pickles': return ('12 × 400 g trade case' if trade else '400 g jar',1)
    if cat=='juices': return ('12 × 750 ml trade case' if trade else '750 ml bottle',1)
    if cat=='dairy': return ('10 kg institutional case' if trade else '500 g pack',1)
    if cat=='natural-care': return ('24-piece trade case' if trade else '1 retail unit',1)
    if cat=='specialty-foods': return ('10 kg trade case' if trade else '500 g pack',1)
    if cat=='seedlings-plants': return ('50-plant nursery lot' if trade else '1 plant',1)
    if cat=='flowers': return ('200-stem trade crate' if trade else '20 stems',1)
    if cat=='farm-boxes': return ('10-box corporate lot' if trade else '1 curated box',1)
    return ('10 kg trade pack' if trade else '1 kg pack',1)

products=[]
idx=0
for cat, names in items.items():
    hs_default, processing, shelf, storage, domestic_markets = category_meta[cat]
    for name in names:
        cluster_key=choose_cluster(name,cat,idx)
        province,district,municipality,network,lat,lng,altitude=clusters[cluster_key]
        province_name=next(x['name'] for x in provinces if x['slug']==province)
        for trade in (False,True):
            idx += 1
            pack,min_order=variant_meta(cat,trade)
            export_ready = bool(trade and (cat in export_categories or cat in seasonal_export_categories))
            export_status = 'rfq-ready' if trade and cat in export_categories else ('seasonal-export' if trade and cat in seasonal_export_categories else 'domestic-ready')
            variant='Trade & Export Pack' if trade and export_ready else ('Wholesale / Institutional Pack' if trade else 'City / Retail Pack')
            product_name=f'{name} — {variant}'
            slug=slugify(f'{cluster_key}-{name}-{"trade" if trade else "city"}')
            price_base=stable_num(name+cat, 140, 780)
            if cat in {'essential-oils'}: price_base=stable_num(name,450,1800)
            if cat in {'tea-coffee','honey','dry-fruits','natural-care','specialty-foods'}: price_base=stable_num(name,280,1200)
            if cat in {'seedlings-plants','flowers'}: price_base=stable_num(name,120,650)
            price=round(price_base*(5.8 if trade else 1.0))
            old=round(price*1.08)
            rating=round(4.5 + stable_num(slug,0,4)/10,1)
            stock=stable_num(slug,18,160) if not trade else stable_num(slug,6,42)
            featured=(stable_num(slug,0,9)<=1)
            source_type='farm/cooperative sourcing cluster' if cat not in {'natural-care','pickles','juices','specialty-foods','oils','dairy'} else 'local producer + origin-linked raw material'
            trade_pack=pack if trade else variant_meta(cat,True)[0]
            export_moq=(stable_num(name,2,8)*10 if cat not in {'essential-oils','natural-care','pickles','juices'} else stable_num(name,2,8))
            lead=stable_num(name+cluster_key,3,14)
            harvest='Seasonal; reconfirm current lot window before order'
            if cat in {'herbs-spices','medicinal-herbs','dried-botanicals','essential-oils','tea-coffee','honey','grains','lentils-beans','dry-fruits','oils','flour-baking','natural-care','specialty-foods','pickles','juices'}:
                harvest='Lot-based / processed stock; raw-material season recorded per supplier'
            hs=hs_exact.get(name, hs_default)
            destinations=['India','Bangladesh','UAE','Qatar','Singapore']
            if cat in {'tea-coffee','honey','medicinal-herbs','dried-botanicals','essential-oils'}:
                destinations=['Germany','France','United Kingdom','Japan','United States','Australia','UAE']
            compliance='Catalog profile only. Supplier identity, botanical/specification match, HS classification, organic or other certifications, laboratory results, phytosanitary/forest or plant-resource permissions, importing-country rules and shipment documents are verified per lot before an export quotation is confirmed.'
            short=(f'{name} sourced through {network} in {district}, Nepal. {variant} with origin cluster, lot handling and buyer-use details for city supply, wholesale and qualified trade inquiries.')
            desc=(f'{name} is represented in Hariyo Mart Nepal as a traceable Nepal-origin sourcing profile linked to {network} around {municipality}, {district}, {province_name}. The listing is designed for {"wholesale, ingredient and export buyers" if trade else "households, chefs, retailers and city buyers"} who need more than a product name: origin cluster, pack format, handling, seller identity and serviceability are kept together in one product record.\n\n'
                  f'This {variant.lower()} uses {pack}. Processing/handling is described as: {processing}. Typical storage guidance is {storage.lower()}. Availability, grade, size, moisture, residue or microbiology targets, packaging artwork, private label, certificates and delivery/export documents are confirmed against the actual supplier lot before order acceptance. Agricultural and botanical products naturally vary by season and origin, so the platform treats the catalog as a sourcing specification rather than a substitute for final lot inspection.')
            benefits=['Nepal origin cluster recorded','Supplier and lot traceability workflow','Wholesale/RFQ-ready specification fields' if trade else 'City delivery and seller matching','Compliance claims verified per actual lot']
            p={
                'slug':slug,'name':product_name,'category':cat,'province':province,'provinceName':province_name,'district':district,'municipality':municipality,'emoji':next(c['emoji'] for c in categories if c['slug']==cat),
                'unit':pack,'price':price,'oldPrice':old,'rating':rating,'stock':stock,'organic':False,'featured':featured,
                'minimumOrder':min_order,'wholesale':bool(trade),'subscription':bool((not trade) and cat in {'fresh-fruits','vegetables','leafy-greens','farm-boxes','dairy'}),
                'shortDescription':short,'description':desc,'uniqueStory':f'{network} is used as a regional sourcing cluster in the seed catalog; every live commercial lot must be linked to the actual farmer, cooperative or local producer before fulfilment.',
                'benefits':benefits,'image':image_map[cat],'images':[image_map[cat]],
                'supplierCluster':cluster_key,'sourceType':source_type,'exportReady':export_ready,'exportStatus':export_status,'hsCodeHint':hs,'botanicalName':botanical.get(name),
                'originAltitude':altitude,'harvestSeason':harvest,'processingMethod':processing,'typicalShelfLifeDays':shelf,'storageGuidance':storage,'tradePack':trade_pack,
                'exportMoq':export_moq,'leadTimeDays':lead,'destinationMarkets':destinations,'domesticMarkets':domestic_markets,'traceabilityLevel':'supplier + cluster + lot','complianceNote':compliance,
            }
            products.append(p)

assert len(products)==420, len(products)
# maintain deterministic featured count and no duplicates
assert len({p['slug'] for p in products})==420

cluster_rows=[{'key':k,'province':v[0],'district':v[1],'municipality':v[2],'name':v[3],'lat':v[4],'lng':v[5],'altitude':v[6]} for k,v in clusters.items()]
catalog={'provinces':provinces,'categories':categories,'sourcingClusters':cluster_rows,'products':products,'meta':{
  'release':'10.0.1','catalogMode':'production-sourcing-seed','productCount':len(products),'baseProductFamilies':210,'sourcingClusters':len(clusters),
  'positioning':'Nepal-origin farm, local-producer, wholesale and export sourcing marketplace',
  'accuracyNote':'Seeded catalog represents authentic product types and sourcing regions, not guaranteed live inventory, certification or export permission. Confirm every commercial lot before sale or export.'
}}
OUT.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Wrote',len(products),'products to',OUT)
