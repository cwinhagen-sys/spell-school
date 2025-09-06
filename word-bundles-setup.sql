-- Create word_bundles table
CREATE TABLE IF NOT EXISTS word_bundles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  words JSONB NOT NULL, -- Array of {en, sv, image_url} objects
  color VARCHAR(7), -- Hex color for category
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_predefined BOOLEAN DEFAULT true
);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_word_bundles_category ON word_bundles(category);
CREATE INDEX IF NOT EXISTS idx_word_bundles_predefined ON word_bundles(is_predefined);

-- Insert predefined word bundles
INSERT INTO word_bundles (category, title, description, words, color) VALUES

-- 1. Places
('Places', 'Classroom', 'Essential classroom vocabulary', 
 '[{"en":"desk","sv":"skrivbord","image_url":null},{"en":"chair","sv":"stol","image_url":null},{"en":"blackboard","sv":"svart tavla","image_url":null},{"en":"pencil","sv":"penna","image_url":null},{"en":"eraser","sv":"suddgummi","image_url":null},{"en":"notebook","sv":"anteckningsbok","image_url":null},{"en":"ruler","sv":"linjal","image_url":null},{"en":"teacher","sv":"lärare","image_url":null},{"en":"student","sv":"elev","image_url":null},{"en":"bag","sv":"väska","image_url":null}]', '#3B82F6'),

('Places', 'Garden', 'Garden and nature vocabulary',
 '[{"en":"flower","sv":"blomma","image_url":null},{"en":"tree","sv":"träd","image_url":null},{"en":"grass","sv":"gräs","image_url":null},{"en":"bush","sv":"buske","image_url":null},{"en":"watering can","sv":"vattningskanna","image_url":null},{"en":"shovel","sv":"spade","image_url":null},{"en":"butterfly","sv":"fjäril","image_url":null},{"en":"bee","sv":"bi","image_url":null},{"en":"bird","sv":"fågel","image_url":null},{"en":"sun","sv":"sol","image_url":null}]', '#10B981'),

('Places', 'In the Park', 'Park and playground vocabulary',
 '[{"en":"bench","sv":"bänk","image_url":null},{"en":"playground","sv":"lekplats","image_url":null},{"en":"swing","sv":"gungstol","image_url":null},{"en":"slide","sv":"rutschkana","image_url":null},{"en":"ball","sv":"boll","image_url":null},{"en":"dog","sv":"hund","image_url":null},{"en":"pond","sv":"damm","image_url":null},{"en":"path","sv":"stig","image_url":null},{"en":"tree","sv":"träd","image_url":null},{"en":"bike","sv":"cykel","image_url":null}]', '#059669'),

('Places', 'At Home', 'Home and household vocabulary',
 '[{"en":"kitchen","sv":"kök","image_url":null},{"en":"bed","sv":"säng","image_url":null},{"en":"sofa","sv":"soffa","image_url":null},{"en":"bathroom","sv":"badrum","image_url":null},{"en":"fridge","sv":"kylskåp","image_url":null},{"en":"lamp","sv":"lampa","image_url":null},{"en":"window","sv":"fönster","image_url":null},{"en":"door","sv":"dörr","image_url":null},{"en":"TV","sv":"TV","image_url":null},{"en":"clock","sv":"klocka","image_url":null}]', '#8B5CF6'),

('Places', 'In the City', 'City and urban vocabulary',
 '[{"en":"bus","sv":"buss","image_url":null},{"en":"car","sv":"bil","image_url":null},{"en":"street","sv":"gata","image_url":null},{"en":"shop","sv":"affär","image_url":null},{"en":"traffic light","sv":"trafikljus","image_url":null},{"en":"bridge","sv":"bro","image_url":null},{"en":"building","sv":"byggnad","image_url":null},{"en":"taxi","sv":"taxi","image_url":null},{"en":"square","sv":"torg","image_url":null},{"en":"café","sv":"kafé","image_url":null}]', '#6B7280'),

-- 2. Food & Drinks
('Food & Drinks', 'Fruits', 'Delicious fruits vocabulary',
 '[{"en":"apple","sv":"äpple","image_url":null},{"en":"banana","sv":"banan","image_url":null},{"en":"orange","sv":"apelsin","image_url":null},{"en":"pear","sv":"päron","image_url":null},{"en":"grapes","sv":"druvor","image_url":null},{"en":"watermelon","sv":"vattenmelon","image_url":null},{"en":"strawberry","sv":"jordgubbe","image_url":null},{"en":"lemon","sv":"citron","image_url":null},{"en":"cherry","sv":"körsbär","image_url":null},{"en":"mango","sv":"mango","image_url":null}]', '#F59E0B'),

('Food & Drinks', 'Vegetables', 'Healthy vegetables vocabulary',
 '[{"en":"carrot","sv":"morot","image_url":null},{"en":"potato","sv":"potatis","image_url":null},{"en":"tomato","sv":"tomat","image_url":null},{"en":"cucumber","sv":"gurka","image_url":null},{"en":"lettuce","sv":"sallad","image_url":null},{"en":"onion","sv":"lök","image_url":null},{"en":"broccoli","sv":"broccoli","image_url":null},{"en":"corn","sv":"majs","image_url":null},{"en":"pea","sv":"ärt","image_url":null},{"en":"pepper","sv":"peppar","image_url":null}]', '#10B981'),

('Food & Drinks', 'Drinks', 'Refreshing drinks vocabulary',
 '[{"en":"water","sv":"vatten","image_url":null},{"en":"milk","sv":"mjölk","image_url":null},{"en":"juice","sv":"juice","image_url":null},{"en":"tea","sv":"te","image_url":null},{"en":"coffee","sv":"kaffe","image_url":null},{"en":"soda","sv":"läsk","image_url":null},{"en":"lemonade","sv":"lemonad","image_url":null},{"en":"hot chocolate","sv":"varm choklad","image_url":null},{"en":"smoothie","sv":"smoothie","image_url":null},{"en":"milkshake","sv":"milkshake","image_url":null}]', '#3B82F6'),

('Food & Drinks', 'Breakfast', 'Morning meal vocabulary',
 '[{"en":"bread","sv":"bröd","image_url":null},{"en":"butter","sv":"smör","image_url":null},{"en":"cheese","sv":"ost","image_url":null},{"en":"egg","sv":"ägg","image_url":null},{"en":"jam","sv":"sylt","image_url":null},{"en":"cereal","sv":"flingor","image_url":null},{"en":"pancake","sv":"pannkaka","image_url":null},{"en":"yogurt","sv":"yoghurt","image_url":null},{"en":"toast","sv":"rostat bröd","image_url":null},{"en":"honey","sv":"honung","image_url":null}]', '#F59E0B'),

('Food & Drinks', 'Lunch & Dinner', 'Main meals vocabulary',
 '[{"en":"soup","sv":"soppa","image_url":null},{"en":"chicken","sv":"kyckling","image_url":null},{"en":"rice","sv":"ris","image_url":null},{"en":"pasta","sv":"pasta","image_url":null},{"en":"salad","sv":"sallad","image_url":null},{"en":"fish","sv":"fisk","image_url":null},{"en":"steak","sv":"biff","image_url":null},{"en":"sandwich","sv":"smörgås","image_url":null},{"en":"pizza","sv":"pizza","image_url":null},{"en":"hamburger","sv":"hamburgare","image_url":null}]', '#EF4444'),

-- 3. Animals
('Animals', 'Pets', 'Cute pet animals vocabulary',
 '[{"en":"dog","sv":"hund","image_url":null},{"en":"cat","sv":"katt","image_url":null},{"en":"rabbit","sv":"kanin","image_url":null},{"en":"hamster","sv":"hamster","image_url":null},{"en":"guinea pig","sv":"marsvin","image_url":null},{"en":"fish","sv":"fisk","image_url":null},{"en":"turtle","sv":"sköldpadda","image_url":null},{"en":"parrot","sv":"papegoja","image_url":null},{"en":"canary","sv":"kanariefågel","image_url":null},{"en":"snake","sv":"orm","image_url":null}]', '#8B5CF6'),

('Animals', 'Farm Animals', 'Farm and countryside animals',
 '[{"en":"cow","sv":"ko","image_url":null},{"en":"pig","sv":"gris","image_url":null},{"en":"sheep","sv":"får","image_url":null},{"en":"goat","sv":"get","image_url":null},{"en":"horse","sv":"häst","image_url":null},{"en":"chicken","sv":"höna","image_url":null},{"en":"duck","sv":"anka","image_url":null},{"en":"goose","sv":"gås","image_url":null},{"en":"donkey","sv":"åsna","image_url":null},{"en":"turkey","sv":"kalkon","image_url":null}]', '#10B981'),

('Animals', 'Wild Animals', 'Wild and exotic animals',
 '[{"en":"lion","sv":"lejon","image_url":null},{"en":"tiger","sv":"tiger","image_url":null},{"en":"elephant","sv":"elefant","image_url":null},{"en":"giraffe","sv":"giraff","image_url":null},{"en":"zebra","sv":"zebra","image_url":null},{"en":"monkey","sv":"apa","image_url":null},{"en":"crocodile","sv":"krokodil","image_url":null},{"en":"rhino","sv":"noshörning","image_url":null},{"en":"hippo","sv":"flodhäst","image_url":null},{"en":"bear","sv":"björn","image_url":null}]', '#F59E0B'),

('Animals', 'Sea Animals', 'Ocean and sea creatures',
 '[{"en":"dolphin","sv":"delfin","image_url":null},{"en":"shark","sv":"haj","image_url":null},{"en":"whale","sv":"val","image_url":null},{"en":"octopus","sv":"bläckfisk","image_url":null},{"en":"crab","sv":"krabba","image_url":null},{"en":"lobster","sv":"hummer","image_url":null},{"en":"jellyfish","sv":"manet","image_url":null},{"en":"starfish","sv":"sjöstjärna","image_url":null},{"en":"seal","sv":"säl","image_url":null},{"en":"turtle","sv":"sköldpadda","image_url":null}]', '#06B6D4'),

('Animals', 'Insects', 'Small crawling and flying creatures',
 '[{"en":"ant","sv":"myra","image_url":null},{"en":"bee","sv":"bi","image_url":null},{"en":"butterfly","sv":"fjäril","image_url":null},{"en":"beetle","sv":"skalbagge","image_url":null},{"en":"mosquito","sv":"mygga","image_url":null},{"en":"spider","sv":"spindel","image_url":null},{"en":"dragonfly","sv":"trollslända","image_url":null},{"en":"grasshopper","sv":"gräshoppa","image_url":null},{"en":"wasp","sv":"geting","image_url":null},{"en":"caterpillar","sv":"larv","image_url":null}]', '#84CC16');

-- Note: This is just the first 3 categories. The full implementation would include all 10 categories.


