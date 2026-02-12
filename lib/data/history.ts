/**
 * History of the Walla Walla Valley — Content Data
 *
 * Static content for 7 chronological eras of Walla Walla history.
 * Every specific date, name, and number cites a source.
 * Content that can't be verified is not included.
 */

export interface HistorySource {
  name: string;
  url?: string;
  description: string;
}

export interface VisitablePlace {
  name: string;
  description: string;
  location?: string;
}

export interface HistoryEra {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  metaDescription: string;
  yearRange: string;
  timelineLabel: string;
  lastUpdated: string;
  readTime: string;
  sections: {
    title: string;
    content: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  sources: HistorySource[];
  visitableToday: VisitablePlace[];
}

export const historyEras: HistoryEra[] = [
  {
    slug: 'indigenous-peoples',
    title: 'The First Peoples of the Valley',
    shortTitle: 'First Peoples',
    description:
      'The Walla Walla, Cayuse, and Umatilla peoples have called this valley home since time immemorial.',
    metaDescription:
      'Learn about the Walla Walla, Cayuse, and Umatilla peoples — the original inhabitants of the Walla Walla Valley. Their history, culture, and ongoing presence in the region.',
    yearRange: 'Time Immemorial – 1850s',
    timelineLabel: 'Pre-contact',
    lastUpdated: 'February 2026',
    readTime: '7 min read',
    sections: [
      {
        title: 'The Original Inhabitants',
        content: `The Walla Walla Valley has been home to Indigenous peoples since time immemorial. The name "Walla Walla" itself comes from the Sahaptin language, commonly translated as "many waters" — a reference to the rivers and streams that flow through the valley.

Three closely related peoples share deep roots in this landscape: the Walla Walla, the Cayuse, and the Umatilla. Each maintained distinct communities and traditions while sharing cultural ties, trade networks, and the Columbia Plateau homeland.

These peoples lived in balance with the land for thousands of years, developing sophisticated knowledge of the seasons, the salmon runs, the root-gathering grounds, and the game trails that sustained their communities.`,
      },
      {
        title: 'Life in the Valley',
        content: `The Walla Walla Valley provided abundant resources. The confluence of rivers and creeks created a rich environment for fishing, hunting, and gathering.

**Salmon**: The Columbia and Snake River systems brought salmon runs that were central to diet, trade, and ceremony. Fishing sites along these rivers were gathering places for communities from across the region.

**Root Gathering**: Camas, bitterroot, and other roots were staple foods. Women held specialized knowledge of where and when to harvest, and root-gathering grounds were carefully managed across generations.

**Horse Culture**: After acquiring horses in the early 1700s, the Cayuse in particular became renowned horsemen. The Cayuse Indian Pony — a distinct breed — reflects the depth of their equestrian tradition.

**Trade Networks**: The valley sat at a crossroads of trade routes connecting the Pacific Coast, the Great Basin, and the northern Plains. This strategic position made the Walla Walla peoples important participants in a vast trade network.`,
      },
      {
        title: 'The Treaty of 1855',
        content: `On June 9, 1855, at a council ground near present-day Walla Walla known as Camp Stevens, representatives of the Walla Walla, Cayuse, and Umatilla peoples signed a treaty with the United States government, represented by Territorial Governor Isaac Stevens.

The treaty ceded millions of acres of homeland in exchange for a reserved homeland — the Umatilla Indian Reservation near Pendleton, Oregon — along with promises of payments, services, and the right to continue fishing, hunting, and gathering at "usual and accustomed" places.

The treaty fundamentally altered life for these peoples, confining communities that had ranged across a vast landscape to a fraction of their original homeland. The promises made in the treaty were often delayed or unfulfilled.

It is important to understand that this history is not simply "past." The treaty remains a living legal document, and the rights reserved under it continue to be exercised and defended today.`,
      },
      {
        title: 'The Confederated Tribes Today',
        content: `Today, the Confederated Tribes of the Umatilla Indian Reservation (CTUIR) represents the Walla Walla, Cayuse, and Umatilla peoples. CTUIR is a sovereign nation with its own government, managing natural resources, cultural programs, and economic enterprises.

CTUIR has been a leader in salmon restoration, habitat conservation, and cultural preservation. Their work to restore First Foods — salmon, roots, berries, and game — reflects a commitment to both cultural continuity and ecological health.

The tribes' presence in the Walla Walla Valley is not historical — it is ongoing. CTUIR members live throughout the region, and the tribes maintain active relationships with local communities, governments, and land managers.

Visitors who want to learn more are encouraged to visit the Tamástslikt Cultural Institute near Pendleton, Oregon, which tells the story of the Cayuse, Umatilla, and Walla Walla peoples in their own words.`,
      },
    ],
    faqs: [
      {
        question: 'What does "Walla Walla" mean?',
        answer:
          'The name "Walla Walla" comes from the Sahaptin language and is commonly translated as "many waters," referring to the rivers and streams that flow through the valley.',
      },
      {
        question: 'Where can I learn about the Indigenous history of the Walla Walla Valley?',
        answer:
          'The Tamástslikt Cultural Institute near Pendleton, Oregon is the best place to learn about the Cayuse, Umatilla, and Walla Walla peoples. It is operated by CTUIR and tells their story in their own words.',
      },
      {
        question: 'Are the Walla Walla, Cayuse, and Umatilla the same tribe?',
        answer:
          'They are three distinct peoples with their own traditions, but they share cultural and linguistic ties. Today they are represented together as the Confederated Tribes of the Umatilla Indian Reservation (CTUIR).',
      },
      {
        question: 'What is the Treaty of 1855?',
        answer:
          'Signed on June 9, 1855, at Camp Stevens near present-day Walla Walla, the treaty between the U.S. government and the Walla Walla, Cayuse, and Umatilla peoples ceded millions of acres of homeland in exchange for a reservation near Pendleton, Oregon, along with reserved rights to fish, hunt, and gather at usual and accustomed places.',
      },
    ],
    sources: [
      {
        name: 'Confederated Tribes of the Umatilla Indian Reservation (CTUIR)',
        url: 'https://ctuir.org',
        description: 'Official website of the Confederated Tribes of the Umatilla Indian Reservation.',
      },
      {
        name: 'Tamástslikt Cultural Institute',
        url: 'https://www.tamastslikt.org',
        description:
          'Cultural center operated by CTUIR telling the story of the Cayuse, Umatilla, and Walla Walla peoples.',
      },
      {
        name: 'Kappler\'s Indian Affairs: Laws and Treaties, Vol. II',
        url: 'https://dc.library.okstate.edu/digital/collection/kapplers/id/26188',
        description: 'Full text of the 1855 Treaty with the Walla Walla, Cayuse, and Umatilla.',
      },
    ],
    visitableToday: [
      {
        name: 'Tamástslikt Cultural Institute',
        description:
          'CTUIR-operated museum and cultural center telling the story of the Cayuse, Umatilla, and Walla Walla peoples.',
        location: 'Pendleton, Oregon (about 45 miles from Walla Walla)',
      },
    ],
  },
  {
    slug: 'exploration-era',
    title: 'Lewis & Clark & the Fur Trade',
    shortTitle: 'Lewis & Clark',
    description:
      'The Corps of Discovery passed through the valley in 1805 and 1806, opening a new chapter of contact and change.',
    metaDescription:
      'The Lewis and Clark expedition reached the Walla Walla Valley in 1805. Learn about their encounters with Chief Yellepit, the fur trade era, and its impact on the region.',
    yearRange: '1805–1840s',
    timelineLabel: '1805–1840s',
    lastUpdated: 'February 2026',
    readTime: '6 min read',
    sections: [
      {
        title: 'The Corps of Discovery Arrives',
        content: `On October 16, 1805, the Lewis and Clark expedition — the Corps of Discovery — reached the confluence of the Snake and Columbia Rivers near present-day Pasco, Washington. Over the following days, they passed through the homeland of the Walla Walla people.

On October 19, 1805, the expedition met Chief Yellepit (also spelled Yelleppit) of the Walla Walla people near the mouth of the Walla Walla River. Clark described the chief as welcoming and noted the exchange of gifts. Yellepit urged them to stay, but the expedition pressed on toward the Pacific.

The outbound journey was brief, but it marked the beginning of sustained contact between the Walla Walla peoples and Euro-Americans.`,
      },
      {
        title: 'The Return Journey, 1806',
        content: `On their return east in the spring of 1806, Lewis and Clark spent more time in the Walla Walla region. They camped near Chief Yellepit's village from April 27 to April 29, 1806.

During this visit, Yellepit hosted the expedition generously, providing food and canoes for river crossing. In exchange, the Americans gave Yellepit a medal, a pistol, and ammunition. The journals describe dancing, feasting, and trade between the two groups.

The return visit was longer and friendlier than the outbound passage, and the expedition's journals provide some of the earliest written descriptions of the Walla Walla Valley and its people from a Euro-American perspective.`,
      },
      {
        title: 'The Fur Trade Era',
        content: `Following Lewis and Clark, the fur trade brought a wave of trappers, traders, and companies into the region. The North West Company and later the Hudson's Bay Company established trading operations across the Columbia Plateau.

**Fort Nez Percés (Fort Walla Walla)**: In 1818, the North West Company built Fort Nez Percés near the confluence of the Walla Walla and Columbia Rivers. After the merger with the Hudson's Bay Company in 1821, it was renamed Fort Walla Walla and became an important trading post.

The fur trade era brought significant changes. Euro-American traders introduced new goods, diseases, and pressures on Indigenous communities. Trade relationships were complex — sometimes cooperative, sometimes exploitative — and they reshaped the social and economic landscape of the valley.

By the 1840s, the fur trade was declining as beaver populations dropped and fashion shifted away from beaver felt hats. But the trading posts and trails established during this era would shape the routes of future settlement.`,
      },
    ],
    faqs: [
      {
        question: 'When did Lewis and Clark reach the Walla Walla area?',
        answer:
          'The expedition first passed through in October 1805, meeting Chief Yellepit on October 19. They returned in April 1806, staying with Yellepit\'s people from April 27 to 29.',
      },
      {
        question: 'Who was Chief Yellepit?',
        answer:
          'Yellepit was a chief of the Walla Walla people who hosted Lewis and Clark during both their westbound and eastbound journeys. The expedition journals describe him as welcoming and generous.',
      },
      {
        question: 'What was Fort Nez Percés?',
        answer:
          'Fort Nez Percés was a fur trading post built by the North West Company in 1818 near the confluence of the Walla Walla and Columbia Rivers. After the merger with the Hudson\'s Bay Company in 1821, it was renamed Fort Walla Walla.',
      },
    ],
    sources: [
      {
        name: 'Journals of the Lewis and Clark Expedition (University of Nebraska-Lincoln)',
        url: 'https://lewisandclarkjournals.unl.edu',
        description:
          'Primary source: digitized journals from the expedition with searchable entries for October 1805 and April 1806.',
      },
      {
        name: 'National Park Service — Lewis and Clark National Historic Trail',
        url: 'https://www.nps.gov/lecl/index.htm',
        description: 'NPS overview of the Lewis and Clark trail including the Walla Walla segment.',
      },
    ],
    visitableToday: [
      {
        name: 'Sacajawea State Park',
        description:
          'Located at the confluence of the Snake and Columbia Rivers where the expedition passed through in October 1805. Interpretive center with exhibits on the expedition and local tribes.',
        location: 'Pasco, Washington (about 60 miles from Walla Walla)',
      },
    ],
  },
  {
    slug: 'whitman-mission',
    title: 'The Whitman Mission',
    shortTitle: 'Whitman Mission',
    description:
      'Marcus and Narcissa Whitman established a mission in 1836 that became a flashpoint in the collision of cultures.',
    metaDescription:
      'The story of the Whitman Mission at Waiilatpu — from its founding in 1836 through the tragic events of 1847. Now a National Historic Site you can visit today.',
    yearRange: '1836–1850s',
    timelineLabel: '1836–1850s',
    lastUpdated: 'February 2026',
    readTime: '8 min read',
    sections: [
      {
        title: 'Arrival at Waiilatpu',
        content: `On September 1, 1836, Marcus and Narcissa Whitman arrived at Waiilatpu — a Cayuse word meaning "place of the rye grass" — about seven miles west of present-day Walla Walla. They had traveled overland from the eastern United States as Protestant missionaries, sponsored by the American Board of Commissioners for Foreign Missions.

Narcissa Whitman and Eliza Spalding, who traveled with the party to establish a separate mission among the Nez Perce, were among the first Euro-American women to cross the Rocky Mountains overland.

The Whitmans established their mission among the Cayuse people, building a home, a school, and eventually a gristmill. Their stated goal was to convert the Cayuse to Christianity and introduce Euro-American agricultural practices.`,
      },
      {
        title: 'Life at the Mission',
        content: `The Whitman Mission operated for eleven years. During that time, it served multiple functions beyond its religious purpose.

**A Way Station on the Oregon Trail**: By the early 1840s, the mission had become an important rest stop for emigrants traveling the Oregon Trail. Hundreds of settlers passed through, resupplying and resting before continuing west. This flow of emigrants would have profound consequences.

**Cultural Tensions**: The relationship between the Whitmans and the Cayuse was complicated from the start. The missionaries sought to change Cayuse ways of life — their religion, their farming practices, their social structures. Many Cayuse resisted these changes, and tensions grew over the years.

**Disease**: Euro-American emigrants brought diseases to which Indigenous peoples had no immunity. Measles epidemics were particularly devastating. The Cayuse saw their population declining while the number of settlers passing through continued to grow.

The mission became a symbol of the larger conflict between Indigenous peoples' sovereignty over their homeland and the westward expansion of the United States.`,
      },
      {
        title: 'The Events of November 29, 1847',
        content: `On November 29, 1847, a group of Cayuse killed Marcus and Narcissa Whitman and eleven others at the mission. Approximately fifty people were taken captive and later ransomed by the Hudson's Bay Company.

The reasons were complex and rooted in years of accumulated grievances: the devastating measles epidemic that was killing Cayuse children while many Euro-American children recovered, the growing stream of settlers passing through Cayuse land, cultural misunderstandings, and the Whitmans' insistence on changing Cayuse ways of life.

In Cayuse tradition, a medicine man who lost patients could be held responsible. Marcus Whitman had been treating both Cayuse and emigrant patients during the measles epidemic, and the disparity in outcomes fueled suspicion and anger.

This event had far-reaching consequences. It contributed to the creation of Oregon Territory in 1848, intensified military action against Indigenous peoples in the region, and set in motion the chain of events leading to the treaties of the 1850s.`,
      },
      {
        title: 'The Aftermath',
        content: `The events at Waiilatpu sent shockwaves through the region. The Oregon Provisional Government organized a militia, and what followed was a period of conflict and upheaval.

In 1850, five Cayuse men were turned over to American authorities and hanged for the killings. Historians continue to debate the circumstances, including whether all five were actually involved and the fairness of the trial.

The mission site was abandoned after 1847. It was designated a National Historic Site in 1936 and is now managed by the National Park Service as the Whitman Mission National Historic Site.

The site preserves the story of the mission, but also interprets the broader context — including the Cayuse perspective, the impact of the Oregon Trail migration, and the collision of cultures that defined this period. The interpretive approach has evolved over the decades to present a more complete picture.`,
      },
    ],
    faqs: [
      {
        question: 'Can you visit the Whitman Mission today?',
        answer:
          'Yes. The Whitman Mission National Historic Site is managed by the National Park Service and is open to visitors. It is located about seven miles west of Walla Walla. The site includes a visitor center, walking trails, and interpretive exhibits.',
      },
      {
        question: 'When was the Whitman Mission established?',
        answer:
          'Marcus and Narcissa Whitman arrived at Waiilatpu on September 1, 1836, and established their mission among the Cayuse people.',
      },
      {
        question: 'What happened at the Whitman Mission in 1847?',
        answer:
          'On November 29, 1847, a group of Cayuse killed Marcus and Narcissa Whitman and eleven others. The event was rooted in years of cultural tension, a devastating measles epidemic, and the growing pressure of westward emigration.',
      },
      {
        question: 'What does Waiilatpu mean?',
        answer:
          'Waiilatpu is a Cayuse word meaning "place of the rye grass." It is the site where the Whitmans established their mission, about seven miles west of present-day Walla Walla.',
      },
    ],
    sources: [
      {
        name: 'National Park Service — Whitman Mission National Historic Site',
        url: 'https://www.nps.gov/whmi/index.htm',
        description:
          'Official NPS site with history, visitor information, and educational resources about the Whitman Mission.',
      },
      {
        name: 'Oregon Historical Society — The Whitmans',
        url: 'https://www.oregonhistoryproject.org',
        description: 'Historical context on the Whitman Mission within Oregon\'s broader history.',
      },
    ],
    visitableToday: [
      {
        name: 'Whitman Mission National Historic Site',
        description:
          'NPS-managed site with visitor center, walking trails, monument, and interpretive exhibits telling the story of the mission and the Cayuse people.',
        location: '328 Whitman Mission Road, Walla Walla, WA (about 7 miles west of town)',
      },
    ],
  },
  {
    slug: 'military-and-settlement',
    title: 'Fort Walla Walla & Town Growth',
    shortTitle: 'Fort & Town',
    description:
      'The U.S. Army established Fort Walla Walla in 1856, and the town that grew around it became a regional hub.',
    metaDescription:
      'How Fort Walla Walla, established in 1856, anchored the growth of one of Washington\'s earliest cities. From military outpost to thriving agricultural town.',
    yearRange: '1856–1900',
    timelineLabel: '1856–1900',
    lastUpdated: 'February 2026',
    readTime: '7 min read',
    sections: [
      {
        title: 'Establishing the Fort',
        content: `In July 1856, Lieutenant Colonel Edward Steptoe established a U.S. Army post in the Walla Walla Valley. This military fort — not to be confused with the earlier Hudson's Bay Company trading post of the same name — was positioned to project American authority over the region following the conflicts of the 1850s.

The fort served as a base for military operations during the various conflicts with Indigenous peoples of the Columbia Plateau. It also provided a sense of security that attracted settlers to the area.

The military presence brought soldiers, civilian workers, and suppliers, creating an economic nucleus around which a town would grow.`,
      },
      {
        title: 'A Town Takes Shape',
        content: `Walla Walla grew rapidly in the late 1850s and 1860s. The town was incorporated in 1862 and soon became one of the most important settlements in Washington Territory.

**Gold Rush Supply Hub**: When gold was discovered in Idaho in the early 1860s, Walla Walla became the primary supply point for miners heading to the goldfields. The town's population boomed as merchants, packers, and entrepreneurs set up shop.

**Early Infrastructure**: By the 1870s, Walla Walla had newspapers, churches, schools, and a growing business district. Baker Boyer Bank, founded in 1869, claims to be the oldest bank in Washington state.

**Whitman College**: Founded in 1859 as a seminary and reorganized as Whitman College in 1882, it became one of the Pacific Northwest's respected liberal arts colleges and remains a cornerstone of the community today.

For a brief period in the 1870s and 1880s, Walla Walla was the largest city in Washington Territory, larger than Seattle. Its position as a trading center and agricultural hub made it a place of real consequence.`,
      },
      {
        title: 'The Railroad Arrives',
        content: `The arrival of the railroad transformed Walla Walla's economy and connected it to national markets.

The Oregon Railroad and Navigation Company reached Walla Walla in the early 1880s, giving farmers and merchants reliable transportation for goods. Wheat, which had already become a major crop, could now be shipped efficiently to Portland and beyond.

The railroad also brought new residents, new businesses, and new connections to the wider world. But it also meant that Walla Walla was no longer the essential stop on the road to somewhere else — travelers could now bypass the town entirely.

This shift would gradually diminish Walla Walla's relative importance as cities like Spokane and Seattle, better positioned on major rail lines, grew faster.`,
      },
      {
        title: 'The Fort Closes',
        content: `Fort Walla Walla continued to operate through the late 19th and early 20th centuries, serving various military functions. The fort was officially closed on September 28, 1910.

The fort's closure marked the end of the military era in Walla Walla, but the town had long since established its own identity as an agricultural and educational center.

Today, the Fort Walla Walla Museum preserves the history of the fort and the broader region. The museum campus includes original and relocated historic buildings, military artifacts, and agricultural exhibits that tell the story of this formative period.`,
      },
    ],
    faqs: [
      {
        question: 'When was Fort Walla Walla established?',
        answer:
          'The U.S. Army post was established in July 1856 by Lieutenant Colonel Edward Steptoe. This was a military fort, distinct from the earlier Hudson\'s Bay Company trading post that also used the name Fort Walla Walla.',
      },
      {
        question: 'Was Walla Walla really bigger than Seattle?',
        answer:
          'Yes. In the 1870s and 1880s, Walla Walla was the largest city in Washington Territory, larger than Seattle. Its role as a supply hub for the Idaho gold mines and a center of wheat farming drove rapid growth.',
      },
      {
        question: 'What is Whitman College?',
        answer:
          'Whitman College is a private liberal arts college in Walla Walla, founded in 1859 as a seminary and reorganized as a college in 1882. It is one of the top-ranked liberal arts colleges in the Pacific Northwest.',
      },
      {
        question: 'Can you visit the old fort?',
        answer:
          'The Fort Walla Walla Museum is located on part of the original fort grounds. The museum campus includes historic buildings, military and agricultural exhibits, and interpretive programs.',
      },
    ],
    sources: [
      {
        name: 'Fort Walla Walla Museum',
        url: 'https://www.fwwm.org',
        description: 'Local museum preserving the history of Fort Walla Walla and the surrounding region.',
      },
      {
        name: 'HistoryLink — Walla Walla',
        url: 'https://www.historylink.org',
        description:
          'Washington State\'s online encyclopedia of history, with articles on Walla Walla\'s founding, the fort, and early settlement.',
      },
      {
        name: 'Whitman College',
        url: 'https://www.whitman.edu/about',
        description: 'Official history of Whitman College, founded 1859.',
      },
    ],
    visitableToday: [
      {
        name: 'Fort Walla Walla Museum',
        description:
          'Museum campus with 17 historic buildings, military artifacts, and agricultural exhibits on the original fort grounds.',
        location: '755 Myra Road, Walla Walla, WA',
      },
      {
        name: 'Whitman College Campus',
        description:
          'Historic liberal arts campus in the heart of Walla Walla. Visitors can walk the grounds and visit the Sheehan Gallery.',
        location: '345 Boyer Avenue, Walla Walla, WA',
      },
    ],
  },
  {
    slug: 'agricultural-heritage',
    title: 'Wheat, Onions & Farming',
    shortTitle: 'Agriculture',
    description:
      'For over a century, agriculture defined the Walla Walla Valley — from vast wheat fields to the famous sweet onion.',
    metaDescription:
      'The agricultural history of the Walla Walla Valley: wheat farming, the famous Walla Walla Sweet Onion, and the farming traditions that shaped the region for over a century.',
    yearRange: '1860s–1960s',
    timelineLabel: '1860s–1960s',
    lastUpdated: 'February 2026',
    readTime: '7 min read',
    sections: [
      {
        title: 'Wheat Country',
        content: `By the 1860s, the Walla Walla Valley had established itself as one of the premier wheat-growing regions in the Pacific Northwest. The deep, fertile soils — loess deposited by wind over millennia — proved ideal for dryland wheat farming.

Wheat defined the landscape and the economy. Rolling hills of golden grain stretched in every direction, and the rhythm of planting and harvest shaped the community's calendar.

The arrival of the railroad in the 1880s gave wheat farmers access to distant markets, and Walla Walla became a major grain shipping center. Flour mills, grain elevators, and warehouses lined the railroad tracks.

Farming in the region required adapting to a semi-arid climate with hot, dry summers. Dryland farming techniques — working with the natural rainfall rather than irrigation — became the standard practice for wheat.`,
      },
      {
        title: 'The Walla Walla Sweet Onion',
        content: `The Walla Walla Sweet Onion has become one of the region's most beloved agricultural products, and its origin story is rooted in immigrant farming traditions.

In the late 1880s, Peter Pieri, a French soldier who had settled on Walla Walla's east side, brought sweet onion seeds from the island of Corsica. Over generations, local farmers selected and replanted the sweetest, mildest bulbs, gradually developing a distinct variety suited to the valley's soil and climate.

The Walla Walla Sweet Onion is known for its exceptionally mild flavor — sweet enough to eat raw, according to local tradition. The onion's character comes from both the seed stock and the growing conditions: the valley's volcanic-influenced soils and long summer days contribute to the low sulfur content that makes the onion so mild.

In 2007, the Walla Walla Sweet Onion was designated the official state vegetable of Washington. The onion harvest, typically in June and July, remains a source of local pride, and the annual Sweet Onion Festival draws visitors each summer.`,
      },
      {
        title: 'A Century of Farming',
        content: `Agriculture shaped every aspect of life in the Walla Walla Valley for more than a century. Beyond wheat and onions, farmers grew asparagus, peas, corn, and various fruits.

**Community Ties**: Farming communities were tight-knit. Neighbors helped with harvest, churches organized around agricultural calendars, and the local economy rose and fell with crop prices and weather.

**Challenges**: Dryland farming was always a gamble with the weather. Drought years could be devastating. Dust storms, grasshopper infestations, and market fluctuations were constant threats.

**Innovation**: Walla Walla farmers adopted new technologies as they became available — from horse-drawn combines to motorized equipment. The region was an early adopter of large-scale mechanized farming techniques.

**Legacy**: Even as wine grapes have become a major crop, wheat farming continues in the hills surrounding the valley. The agricultural heritage is visible everywhere — in the grain elevators, the farmsteads, and the patterns of fields on the surrounding hills.`,
      },
      {
        title: 'From Farmland to Vineyards',
        content: `The transition from traditional agriculture to wine grapes began slowly in the 1970s and accelerated through the 1990s and 2000s. Former wheat fields, pastures, and orchards gradually gave way to vineyard rows.

This transformation wasn't without tension. Some longtime farming families embraced the opportunity; others watched with mixed feelings as the landscape they'd known for generations changed character.

The agricultural infrastructure — irrigation systems, farm roads, equipment dealers — adapted to serve a new kind of farming. And the farming ethic itself carried over: many of Walla Walla's best winemakers come from farming backgrounds and approach viticulture with the same combination of hard work, practical knowledge, and respect for the land.

Today, the valley's identity encompasses both its agricultural heritage and its wine country present. The two traditions coexist, and the best of Walla Walla's wine culture draws on the region's deep roots in the land.`,
      },
    ],
    faqs: [
      {
        question: 'What is the Walla Walla Sweet Onion?',
        answer:
          'The Walla Walla Sweet Onion is an exceptionally mild, sweet onion variety developed over generations from seeds brought from Corsica by Peter Pieri in the late 1880s. It was designated Washington\'s official state vegetable in 2007.',
      },
      {
        question: 'Is Walla Walla still a farming community?',
        answer:
          'Yes. While wine grapes have become a major crop, wheat farming continues in the surrounding hills. The agricultural heritage remains a core part of the valley\'s identity.',
      },
      {
        question: 'When is the Walla Walla Sweet Onion harvest?',
        answer:
          'The onion harvest typically runs from mid-June through July. The annual Sweet Onion Festival celebrates the harvest each summer.',
      },
      {
        question: 'Who brought the sweet onion seeds to Walla Walla?',
        answer:
          'Peter Pieri, a French soldier who had settled on Walla Walla\'s east side, brought sweet onion seeds from the island of Corsica in the late 1880s. Local farmers then selected and developed the variety over generations.',
      },
    ],
    sources: [
      {
        name: 'Walla Walla Sweet Onion Marketing Committee',
        url: 'https://www.sweetonions.org',
        description:
          'Official source for the history and promotion of the Walla Walla Sweet Onion.',
      },
      {
        name: 'Washington State Legislature — Official State Symbols',
        description:
          'The Walla Walla Sweet Onion was designated the official state vegetable in 2007 (RCW 1.20.130).',
      },
      {
        name: 'Fort Walla Walla Museum — Agricultural Exhibits',
        url: 'https://www.fwwm.org',
        description: 'Museum exhibits on the agricultural history of the Walla Walla Valley.',
      },
    ],
    visitableToday: [
      {
        name: 'Fort Walla Walla Museum',
        description:
          'Agricultural exhibits including vintage farming equipment, a pioneer village, and displays on the wheat farming era.',
        location: '755 Myra Road, Walla Walla, WA',
      },
      {
        name: 'Local Farms & Farm Stands',
        description:
          'During growing season, several farm stands sell Walla Walla Sweet Onions and other local produce.',
        location: 'Various locations around the valley',
      },
    ],
  },
  {
    slug: 'wine-pioneers',
    title: 'Birth of Wine Country',
    shortTitle: 'Wine Pioneers',
    description:
      'A handful of visionary winemakers transformed the valley from wheat country into a world-class wine region.',
    metaDescription:
      'How Walla Walla became wine country: from Leonetti Cellar in 1977 to AVA status in 1984 and the pioneers who put the region on the world wine map.',
    yearRange: '1970s–2000s',
    timelineLabel: '1970s–2000s',
    lastUpdated: 'February 2026',
    readTime: '8 min read',
    sections: [
      {
        title: 'The First Winery',
        content: `In 1977, Gary Figgins founded Leonetti Cellar, making it the first commercial, bonded winery in the Walla Walla Valley. Figgins came from a farming family with Italian roots — his grandfather had made wine at home for decades, as many Italian immigrant families in the valley did.

But Leonetti was different. Figgins set out to make world-class wine, not just homemade table wine. He planted Cabernet Sauvignon and Merlot, drew on both family tradition and emerging winemaking science, and produced wines that would quickly gain national attention.

Leonetti Cellar's early vintages proved something that few people at the time believed: the Walla Walla Valley could produce wines of exceptional quality. The combination of warm days, cool nights, and well-drained soils turned out to be ideal for red Bordeaux varieties.

Today, Leonetti Cellar remains one of the most sought-after producers in the state, and its founding is widely regarded as the moment Walla Walla's wine story began.`,
      },
      {
        title: 'The Next Wave',
        content: `Leonetti Cellar was soon followed by other pioneers who saw the valley's potential.

**Woodward Canyon Winery**: Founded by Rick Small in 1981, Woodward Canyon became the second bonded winery in the valley. Small, like Figgins, focused on quality from the start. His wines helped establish the valley's reputation for serious, age-worthy reds.

**L'Ecole No 41**: Founded in 1983 by Jean and Baker Ferguson in the historic Frenchtown schoolhouse, L'Ecole brought a different sensibility — a connection to the valley's Franco-American heritage and a commitment to making wines that reflected the place.

These early wineries operated on small budgets and big ambition. They shared equipment, traded knowledge, and collectively made the case that Walla Walla was not just a farming town but a wine region worth watching.

The spirit of collaboration among winemakers — unusual in an often-competitive industry — became a defining characteristic of Walla Walla wine country and continues to this day.`,
      },
      {
        title: 'AVA Recognition',
        content: `In February 1984, the Walla Walla Valley was officially approved as an American Viticultural Area (AVA) by the Bureau of Alcohol, Tobacco, and Firearms. It was only the second AVA designated in Washington state, after the larger Yakima Valley AVA.

AVA status was more than bureaucratic recognition — it meant that wines labeled "Walla Walla Valley" came from a defined, distinctive growing region. This gave the valley's wines an identity and a marketing tool that helped them stand out in an increasingly crowded market.

The AVA designation reflected what the early winemakers already knew: the Walla Walla Valley had unique growing conditions — the specific combination of soils, climate, elevation, and latitude — that produced wines with distinctive character.

At the time of AVA approval, there were only a handful of wineries in the valley. The designation was an act of faith in the region's future, and that faith would be vindicated in the decades to come.`,
      },
      {
        title: 'Growth and Recognition',
        content: `Through the 1990s and into the 2000s, the Walla Walla wine scene grew steadily. New wineries opened, new vineyards were planted, and the quality of the wines attracted increasing national and international attention.

**Key developments of this period**:

**Scoring and Reviews**: Wine critics began giving Walla Walla wines high scores, bringing national visibility. Leonetti, Woodward Canyon, and emerging producers like Cayuse, K Vintners, and Gramercy Cellars earned acclaim.

**Tourism Growth**: Wine tourists began arriving in growing numbers. Downtown Walla Walla tasting rooms opened, restaurants improved, and lodging options expanded to serve visitors.

**Vineyard Planting**: As demand grew, more vineyards were planted across the valley. Growers experimented with different grape varieties and discovered which sites produced the best fruit.

**Community Impact**: Wine transformed Walla Walla's economy and culture. The downtown revitalized, property values rose, and the town gained a new identity as a destination.

By 2000, the Walla Walla Valley had roughly 30 wineries — a dramatic increase from the three pioneers of the early 1980s, but still modest compared to what would come next.`,
      },
    ],
    faqs: [
      {
        question: 'What was the first winery in Walla Walla?',
        answer:
          'Leonetti Cellar, founded by Gary Figgins in 1977, was the first commercial, bonded winery in the Walla Walla Valley.',
      },
      {
        question: 'When did Walla Walla become an AVA?',
        answer:
          'The Walla Walla Valley AVA was approved in February 1984, making it the second American Viticultural Area designated in Washington state.',
      },
      {
        question: 'What makes Walla Walla wines distinctive?',
        answer:
          'The valley\'s combination of warm days, cool nights, well-drained soils (including volcanic basalt and wind-deposited loess), and specific latitude creates ideal conditions for red Bordeaux varieties like Cabernet Sauvignon and Syrah.',
      },
      {
        question: 'How many wineries were in Walla Walla in the early years?',
        answer:
          'In the early 1980s, there were only three wineries: Leonetti Cellar (1977), Woodward Canyon (1981), and L\'Ecole No 41 (1983). By 2000, that had grown to roughly 30.',
      },
    ],
    sources: [
      {
        name: 'Walla Walla Valley Wine Alliance',
        url: 'https://www.wallawallawine.com',
        description: 'Official wine industry organization with history of the AVA and member wineries.',
      },
      {
        name: 'TTB — Established American Viticultural Areas',
        url: 'https://www.ttb.gov/wine/established-avas',
        description:
          'Federal registry of AVAs including the Walla Walla Valley AVA approval date (February 1984).',
      },
      {
        name: 'Leonetti Cellar',
        url: 'https://www.leonetticellar.com',
        description: 'Official website of the first bonded winery in the Walla Walla Valley.',
      },
    ],
    visitableToday: [
      {
        name: 'Leonetti Cellar',
        description:
          'The valley\'s first bonded winery (1977). Visits are by mailing list allocation only.',
        location: 'Walla Walla, WA',
      },
      {
        name: 'L\'Ecole No 41',
        description:
          'Founded in 1983 in the historic Frenchtown schoolhouse. Open for tastings.',
        location: '41 Lowden School Road, Lowden, WA',
      },
      {
        name: 'Woodward Canyon Winery',
        description:
          'The valley\'s second bonded winery (1981). Tasting room open to visitors.',
        location: '11920 W Hwy 12, Lowden, WA',
      },
    ],
  },
  {
    slug: 'modern-wine-era',
    title: 'Modern Wine Country',
    shortTitle: 'Modern Era',
    description:
      'Today, with over 120 wineries, Walla Walla is one of America\'s premier wine destinations.',
    metaDescription:
      'Modern Walla Walla wine country: over 120 wineries, the Rocks District sub-AVA, downtown transformation, and a vibrant community built around wine.',
    yearRange: '2000s–Present',
    timelineLabel: '2000s–Present',
    lastUpdated: 'February 2026',
    readTime: '7 min read',
    sections: [
      {
        title: 'Explosive Growth',
        content: `The 2000s brought dramatic growth to the Walla Walla wine scene. From roughly 30 wineries in 2000, the valley grew to over 120 wineries — a number that continues to evolve as new producers open and the industry matures.

This growth was driven by several factors: continued critical acclaim for Walla Walla wines, rising consumer interest in wine regions beyond California, and the appeal of the valley's unpretentious, welcoming culture.

New winemakers arrived from diverse backgrounds — some from farming families, others from careers in business, law, or other fields. What they shared was a passion for wine and an attraction to the Walla Walla community.

The diversity of producers is one of the valley's strengths today. From tiny garage operations making a few hundred cases to larger, professionally managed estates, the range of styles and approaches gives visitors an unusually varied tasting experience.`,
      },
      {
        title: 'The Rocks District',
        content: `In 2015, The Rocks District of Milton-Freewater was approved as a sub-AVA within the Walla Walla Valley AVA. Located just across the Oregon state line, this distinctive area is defined by its unique soil — specifically, the large basalt cobblestones (known locally as "cobbles" or "river rocks") that cover the vineyard floor.

The Rocks District is one of the most geologically distinctive wine-growing areas in the world. The cobblestones, deposited by the ancient Walla Walla River, absorb heat during the day and radiate it back to the vines at night, creating a unique microclimate.

Wines from The Rocks District — particularly Syrah — have a distinctive character that reflects this unusual terroir. The sub-AVA recognition acknowledged what winemakers had already demonstrated: this specific patch of ground produces wines unlike anywhere else.

The Rocks District represents the maturation of the Walla Walla wine industry — from a region trying to prove it could make good wine to one sophisticated enough to distinguish between specific sites and their unique expressions.`,
      },
      {
        title: 'Downtown Transformation',
        content: `Wine didn't just change the countryside — it transformed downtown Walla Walla. What had been a quiet agricultural town center became a vibrant destination with tasting rooms, restaurants, boutique hotels, and galleries.

**Tasting Rooms**: Dozens of wineries opened tasting rooms in downtown's historic buildings, making it possible to walk between multiple producers without driving. This concentration of tasting rooms is one of Walla Walla's most distinctive features.

**Restaurants**: The quality and diversity of dining improved dramatically. From casual wine bars to fine dining, the restaurant scene grew to match the sophistication of the wines.

**Lodging**: Boutique hotels, bed-and-breakfasts, and vacation rentals multiplied to accommodate growing visitor numbers.

**Art and Culture**: Galleries, live music, and cultural events added depth to the visitor experience beyond wine.

The downtown transformation happened organically, driven by small business owners and entrepreneurs rather than corporate development. This gives Walla Walla's downtown an authentic, independent character that visitors often cite as part of the appeal.`,
      },
      {
        title: 'Walla Walla Today',
        content: `Today, Walla Walla wine country occupies a unique position in the American wine landscape. It combines world-class wine quality with a small-town, approachable atmosphere that sets it apart from larger, more commercialized wine regions.

**What defines the modern era**:

**Quality and Diversity**: The range of wines produced — from powerful Cabernet Sauvignon to elegant Syrah to increasingly interesting white wines — reflects both the valley's terroir and its winemakers' ambition.

**Welcoming Culture**: Winemakers still pour their own wines, conversations are genuine, and the pretension common in some wine regions is notably absent. This accessibility is a competitive advantage.

**Community**: Wine has strengthened rather than replaced the community spirit. Agricultural traditions persist alongside wine culture, and the town maintains a real-life character that goes beyond tourism.

**Challenges**: Growth brings challenges — housing affordability, water resources, balancing tourism with quality of life for residents. The community continues to navigate these tensions.

The Walla Walla Valley's story is still being written. What began with a handful of pioneers has become a thriving wine region, but the values that defined its early years — quality, collaboration, and connection to the land — remain at its core.`,
      },
    ],
    faqs: [
      {
        question: 'How many wineries are in Walla Walla?',
        answer:
          'There are over 120 wineries in the Walla Walla Valley. The exact number changes as new wineries open and the industry evolves.',
      },
      {
        question: 'What is The Rocks District?',
        answer:
          'The Rocks District of Milton-Freewater is a sub-AVA within the Walla Walla Valley, approved in 2015. Located just across the Oregon state line, it is defined by its distinctive basalt cobblestones that create a unique microclimate, particularly well-suited to Syrah.',
      },
      {
        question: 'Can you walk to wineries in downtown Walla Walla?',
        answer:
          'Yes. Dozens of wineries have tasting rooms in downtown Walla Walla, making it easy to walk between multiple producers. This walkable wine tasting is one of the valley\'s most distinctive features.',
      },
      {
        question: 'What wines is Walla Walla known for?',
        answer:
          'Walla Walla is best known for Cabernet Sauvignon and Syrah, along with Merlot and Bordeaux-style blends. The region is also producing increasingly interesting white wines including Chardonnay and Viognier.',
      },
    ],
    sources: [
      {
        name: 'Walla Walla Valley Wine Alliance',
        url: 'https://www.wallawallawine.com',
        description: 'Official wine industry organization with current winery listings and AVA information.',
      },
      {
        name: 'TTB — The Rocks District of Milton-Freewater AVA',
        url: 'https://www.ttb.gov/wine/established-avas',
        description: 'Federal registry confirming the 2015 approval of The Rocks District sub-AVA.',
      },
    ],
    visitableToday: [
      {
        name: 'Downtown Walla Walla Tasting Rooms',
        description:
          'Walk between dozens of tasting rooms in the historic downtown core. No driving needed.',
        location: 'Main Street and surrounding blocks, downtown Walla Walla',
      },
      {
        name: 'The Rocks District Vineyards',
        description:
          'Visit wineries in this unique sub-AVA with its distinctive cobblestone-covered vineyard floors.',
        location: 'Milton-Freewater, Oregon (just south of Walla Walla)',
      },
    ],
  },
];

/**
 * Get all history eras
 */
export function getAllHistoryEras(): HistoryEra[] {
  return historyEras;
}

/**
 * Get a history era by slug
 */
export function getHistoryEraBySlug(slug: string): HistoryEra | null {
  return historyEras.find((era) => era.slug === slug) || null;
}

/**
 * Get all history era slugs for static generation
 */
export function getAllHistoryEraSlugs(): string[] {
  return historyEras.map((era) => era.slug);
}
