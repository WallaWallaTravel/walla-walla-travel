/**
 * Social Media Post Templates
 * 
 * Pre-built templates for common social media post types
 * Organized by platform and content category
 */

export interface PostTemplate {
  id: string
  name: string
  category: 'promotional' | 'educational' | 'engagement' | 'seasonal' | 'testimonial' | 'behind_scenes'
  platforms: ('instagram' | 'facebook' | 'linkedin' | 'tiktok')[]
  template: string
  hashtags: string[]
  bestTimes: string[]
  tips: string[]
  exampleVariables: Record<string, string>
}

export const socialTemplates: PostTemplate[] = [
  // PROMOTIONAL
  {
    id: 'promo-seasonal-sale',
    name: 'Seasonal Sale',
    category: 'promotional',
    platforms: ['instagram', 'facebook'],
    template: `🍷 {{season}} Special Alert! 🍷

Save {{discount}}% on all wine tours this {{month}}! 

Whether you're celebrating {{occasion}} or just craving an escape to wine country, there's never been a better time to visit Walla Walla.

✨ What's included:
• Transportation in luxury {{vehicle}}
• Visits to {{winery_count}} award-winning wineries
• Expert guide and local insights
• All tasting fees covered

Book now and create memories that last a lifetime! Link in bio 🍇

{{hashtags}}`,
    hashtags: ['WallaWallaWine', 'WineTour', 'WineCountry', 'WashingtonWine', 'WineLovers'],
    bestTimes: ['11:00', '15:00', '19:00'],
    tips: [
      'Use urgency words like "Limited time" or "This weekend only"',
      'Include specific savings amount',
      'Highlight what makes this offer unique'
    ],
    exampleVariables: {
      season: 'Holiday',
      discount: '20',
      month: 'December',
      occasion: 'the holidays',
      vehicle: 'Mercedes Sprinter',
      winery_count: '4'
    }
  },
  {
    id: 'promo-group-offer',
    name: 'Group Booking',
    category: 'promotional',
    platforms: ['instagram', 'facebook', 'linkedin'],
    template: `Planning a group getaway? 🥂

Gather your {{group_type}} and experience Walla Walla wine country together!

🎁 Special Group Rate:
• {{guests}}+ guests = {{discount}}% off
• Private {{vehicle}} experience
• Customized winery selection
• Lunch included at {{restaurant}}

Perfect for:
✓ Corporate retreats
✓ Bachelor/Bachelorette parties
✓ Family reunions
✓ Birthday celebrations

DM us to start planning your perfect day! 🍷

{{hashtags}}`,
    hashtags: ['GroupTravel', 'WineCountry', 'CorporateEvents', 'WallWallaWine'],
    bestTimes: ['10:00', '14:00'],
    tips: [
      'Tag relevant accounts for corporate posts',
      'Use carousel format showing group activities',
      'Include testimonial from past group'
    ],
    exampleVariables: {
      group_type: 'crew',
      guests: '8',
      discount: '15',
      vehicle: 'charter bus',
      restaurant: 'local farm-to-table bistro'
    }
  },

  // EDUCATIONAL
  {
    id: 'edu-winery-spotlight',
    name: 'Winery Spotlight',
    category: 'educational',
    platforms: ['instagram', 'facebook', 'linkedin'],
    template: `🍷 Winery Spotlight: {{winery_name}}

Did you know? {{fun_fact}}

What makes {{winery_name}} special:
🍇 {{speciality_1}}
🏆 {{award_info}}
✨ {{unique_experience}}

Pro tip: Ask about their {{wine_recommendation}} - it's not on the regular tasting menu but absolutely worth it!

Want to visit? We include {{winery_name}} on many of our curated tours. Link in bio to book! 🚐

{{hashtags}}`,
    hashtags: ['WallaWallaWinery', 'WineEducation', 'WineCountry', 'WineryTour'],
    bestTimes: ['12:00', '17:00', '20:00'],
    tips: [
      'Tag the winery for potential reshare',
      'Use their photos if they allow',
      'Include lesser-known facts for engagement'
    ],
    exampleVariables: {
      winery_name: "L'Ecole No 41",
      fun_fact: 'This winery operates out of a historic 1915 schoolhouse',
      speciality_1: 'Estate-grown Semillon',
      award_info: 'Named Winery of the Year by Wine & Spirits',
      unique_experience: 'Barrel room tasting experience',
      wine_recommendation: 'library reserve Cabernet'
    }
  },
  {
    id: 'edu-wine-101',
    name: 'Wine 101 Tip',
    category: 'educational',
    platforms: ['instagram', 'tiktok'],
    template: `🍷 Wine 101: {{topic}}

{{opening_hook}}

Here's what you need to know:

{{tip_1}}
{{tip_2}}
{{tip_3}}

💡 Pro tip: {{pro_tip}}

Save this for your next wine tasting! 📌

What wine topics do you want to learn about? Drop a comment! 👇

{{hashtags}}`,
    hashtags: ['Wine101', 'WineEducation', 'WineTips', 'LearnAboutWine', 'WineLover'],
    bestTimes: ['11:00', '18:00', '21:00'],
    tips: [
      'Keep tips actionable and easy to remember',
      'Use carousel format for multiple tips',
      'Ask questions to boost engagement'
    ],
    exampleVariables: {
      topic: 'How to taste wine like a pro',
      opening_hook: 'Stop gulping and start savoring! 😉',
      tip_1: '👀 Look: Tilt the glass and observe the color',
      tip_2: '👃 Smell: Swirl gently and take 2-3 short sniffs',
      tip_3: '👅 Taste: Let it coat your entire tongue',
      pro_tip: 'Breathe in through your mouth while tasting to unlock hidden flavors'
    }
  },

  // ENGAGEMENT
  {
    id: 'engage-poll',
    name: 'Wine Poll',
    category: 'engagement',
    platforms: ['instagram', 'facebook'],
    template: `Let's settle this debate! 🍷

{{poll_question}}

A) {{option_a}}
B) {{option_b}}

Vote in the comments! 👇

(Wrong answers will be judged... just kidding! There's no wrong answer in wine 😉)

{{hashtags}}`,
    hashtags: ['WinePoll', 'WineLovers', 'WineDebate', 'WallaWallaWine'],
    bestTimes: ['12:00', '18:00', '20:00'],
    tips: [
      'Use Stories for actual poll feature',
      'Reply to every comment to boost engagement',
      'Share results in follow-up post'
    ],
    exampleVariables: {
      poll_question: 'Red or white with Thanksgiving dinner?',
      option_a: '🔴 Red all the way',
      option_b: '⚪ White is right'
    }
  },
  {
    id: 'engage-question',
    name: 'Discussion Starter',
    category: 'engagement',
    platforms: ['instagram', 'facebook', 'linkedin'],
    template: `{{emoji}} Question for my wine-loving friends:

{{main_question}}

I'll go first: {{your_answer}}

Your turn! Share yours in the comments 👇

{{hashtags}}`,
    hashtags: ['WineCommunity', 'WineConversation', 'WineLovers'],
    bestTimes: ['11:00', '19:00'],
    tips: [
      'Always answer your own question first',
      'Ask follow-up questions in comments',
      'Use questions that have many valid answers'
    ],
    exampleVariables: {
      emoji: '🍷✨',
      main_question: 'What was the wine that made you fall in love with wine?',
      your_answer: 'A 2010 Leonetti Cabernet on a sunset patio in Walla Walla. Changed everything!'
    }
  },

  // SEASONAL
  {
    id: 'seasonal-holiday',
    name: 'Holiday Celebration',
    category: 'seasonal',
    platforms: ['instagram', 'facebook'],
    template: `{{holiday_emoji}} Happy {{holiday}}! {{holiday_emoji}}

{{seasonal_message}}

{{personal_note}}

From our Walla Walla Travel family to yours - we hope your day is filled with {{holiday_wish}}.

Cheers! 🥂

{{hashtags}}`,
    hashtags: ['WallaWallaTravel', 'WineCountry', 'Cheers'],
    bestTimes: ['09:00', '12:00', '18:00'],
    tips: [
      'Post early on the holiday',
      'Keep it genuine and warm',
      'Include team photo if possible'
    ],
    exampleVariables: {
      holiday_emoji: '🦃',
      holiday: 'Thanksgiving',
      seasonal_message: 'Today we\'re grateful for the incredible wine country we call home.',
      personal_note: 'And for guests like YOU who make every tour special.',
      holiday_wish: 'good wine, great company, and delicious food'
    }
  },

  // TESTIMONIAL
  {
    id: 'testimonial-guest',
    name: 'Guest Testimonial',
    category: 'testimonial',
    platforms: ['instagram', 'facebook', 'linkedin'],
    template: `"{{testimonial_quote}}"

— {{guest_name}}, {{guest_location}}

Thank you, {{guest_first_name}}, for trusting us with your special day! 🥂

Moments like these remind us why we love what we do. ❤️

Ready to create your own Walla Walla memories? Link in bio! 🍇

{{hashtags}}`,
    hashtags: ['WallaWallaTravel', 'GuestLove', 'WineTour', 'CustomerReview'],
    bestTimes: ['11:00', '15:00', '19:00'],
    tips: [
      'Ask permission before posting',
      'Include photo from their tour if available',
      'Tag them (with permission) for authenticity'
    ],
    exampleVariables: {
      testimonial_quote: 'Best day of our trip! Our driver knew every winemaker by name and got us into tastings we never could have found on our own. Already planning our return!',
      guest_name: 'Sarah & Michael',
      guest_location: 'Seattle, WA',
      guest_first_name: 'Sarah'
    }
  },

  // BEHIND THE SCENES
  {
    id: 'bts-driver',
    name: 'Meet the Driver',
    category: 'behind_scenes',
    platforms: ['instagram', 'facebook'],
    template: `Meet {{driver_name}}! 🚐

{{driver_intro}}

🍷 Favorite Walla Walla wine: {{favorite_wine}}
🏆 Hidden gem recommendation: {{hidden_gem}}
💡 Top tip for visitors: "{{driver_tip}}"

When you book with us, you're not just getting a ride - you're getting a local guide who genuinely loves sharing wine country with you.

Book a tour with {{driver_name}} - link in bio! 🍇

{{hashtags}}`,
    hashtags: ['MeetTheTeam', 'WallaWallaTravel', 'LocalGuide', 'WineTour'],
    bestTimes: ['10:00', '14:00', '18:00'],
    tips: [
      'Use candid photos over posed ones',
      'Let their personality shine through',
      'Include a fun fact about them'
    ],
    exampleVariables: {
      driver_name: 'Jake',
      driver_intro: 'Jake has been with us for 3 years and knows every backroad in wine country. When he\'s not driving tours, you\'ll find him hiking the Blue Mountains.',
      favorite_wine: 'Cayuse Bionic Frog Syrah',
      hidden_gem: 'Beresan Winery - best picnic spot with a view',
      driver_tip: 'Don\'t try to hit 10 wineries. Pick 3-4 and really savor the experience.'
    }
  },
  {
    id: 'bts-day-in-life',
    name: 'Day in the Life',
    category: 'behind_scenes',
    platforms: ['instagram', 'tiktok'],
    template: `A day in the life of a Walla Walla wine tour 🍷🚐

{{time_1}} - {{activity_1}}
{{time_2}} - {{activity_2}}
{{time_3}} - {{activity_3}}
{{time_4}} - {{activity_4}}
{{time_5}} - {{activity_5}}

And that's just the highlights! Every tour is different because we customize based on what YOU want to experience.

What would be on YOUR dream wine tour itinerary? 👇

{{hashtags}}`,
    hashtags: ['DayInTheLife', 'WineTour', 'WallaWalla', 'BehindTheScenes'],
    bestTimes: ['12:00', '17:00', '20:00'],
    tips: [
      'Use video format for TikTok/Reels',
      'Show real moments, not staged',
      'Include unexpected delightful moments'
    ],
    exampleVariables: {
      time_1: '10:00 AM',
      activity_1: 'Pick up from downtown hotel ☕',
      time_2: '10:45 AM',
      activity_2: 'First winery - private barrel tasting 🍷',
      time_3: '12:30 PM',
      activity_3: 'Farm-to-table lunch with wine pairing 🍽️',
      time_4: '2:30 PM',
      activity_4: 'Meet the winemaker at their estate 🍇',
      time_5: '5:00 PM',
      activity_5: 'Sunset tasting on the patio 🌅'
    }
  }
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: PostTemplate['category']): PostTemplate[] {
  return socialTemplates.filter(t => t.category === category)
}

/**
 * Get templates by platform
 */
export function getTemplatesByPlatform(platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok'): PostTemplate[] {
  return socialTemplates.filter(t => t.platforms.includes(platform))
}

/**
 * Fill template with variables
 */
export function fillTemplate(template: PostTemplate, variables: Record<string, string>): string {
  let filledContent = template.template
  
  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    filledContent = filledContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  
  // Replace hashtags
  const hashtagString = template.hashtags.map(h => `#${h}`).join(' ')
  filledContent = filledContent.replace('{{hashtags}}', hashtagString)
  
  return filledContent
}

/**
 * Get suggested posting time
 */
export function getSuggestedTime(template: PostTemplate, dayOfWeek: number): string {
  // Best times vary by day
  const timeIndex = dayOfWeek % template.bestTimes.length
  return template.bestTimes[timeIndex]
}

const socialTemplatesApi = {
  templates: socialTemplates,
  getTemplatesByCategory,
  getTemplatesByPlatform,
  fillTemplate,
  getSuggestedTime
};

export default socialTemplatesApi;







