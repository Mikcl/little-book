import React, { useReducer, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

interface Virtue {
  name: string;
  emoji: string;
  description: string;
  examples: string[];
}

const virtuesDict: Record<string, Virtue> = {
  'Temperance': {
    name: 'Temperance',
    emoji: '🧘‍♂️',
    description: 'Eat not to dullness; drink not to elevation.',
    examples: [
      'Choose a small portion of dessert, savoring each bite.',
      'Skip the extra helping when already satisfied.',
    ],
  },
  'Silence': {
    name: 'Silence',
    emoji: '🕊️',
    description: 'Speak only when it benefits others or yourself. Avoid trifling conversation.',
    examples: [
      'Listen intently when a friend is sharing their struggles.',
      'Pause before speaking, ensuring your words add value.',
      'Skip gossip and steer the conversation to shared interests.',
    ],
  },
  'Order': {
    name: 'Order',
    emoji: '🗂️',
    description: 'Let all things have their place; let each part of your business have its time.',
    examples: [
      'Organize your workspace before starting a task.',
      'Plan your errands in a logical route to save time.',
      'Schedule focused time for a project, free from interruptions.',
    ],
  },
  'Resolution': {
    name: 'Resolution',
    emoji: '💪',
    description: 'Resolve to perform what you ought; perform without fail what you resolve.',
    examples: [
      'Finish the chapter you started before putting the book down.',
      "Complete the task you've been procrastinating on today.",
      'Following through on promises.',
    ],
  },
  'Frugality': {
    name: 'Frugality',
    emoji: '🌱',
    description: 'Make no expense but to do good to others or yourself; waste nothing.',
    examples: [
      'Packing a lunch instead of eating out.',
      'Cancel unused subscriptions to free up resources.',
    ],
  },
  'Industry': {
    name: 'Industry',
    emoji: '🛠️',
    description: 'Always be engaged in something useful; avoid idleness.',
    examples: [
      'Using free time to learn a new skill.',
      'Volunteering time to a worthwhile cause.',
      'Completing tasks promptly and efficiently.',
    ],
  },
  'Sincerity': {
    name: 'Sincerity',
    emoji: '🤝',
    description: 'Use no hurtful deceit; think innocently and justly, and speak accordingly.',
    examples: [
      "Gently admit when you don't know the answer instead of bluffing.",
      'Thank someone genuinely for their effort, even if small.',
      'Speak honestly about your needs while remaining kind.',
    ],
  },
  'Justice': {
    name: 'Justice',
    emoji: '⚖️',
    description: 'Wrong none by doing injuries or omitting benefits that are your duty.',
    examples: [
      "Speak up for a coworker when they're unfairly blamed.",
      'Share credit with everyone who contributed to a project.',
      'Return a lost wallet you find, ensuring its owner gets it back.',
    ],
  },
  'Moderation': {
    name: 'Moderation',
    emoji: '🛑',
    description: 'Avoid extremes; forbear resenting injuries as much as you think they deserve.',
    examples: [
      'Take a break when working too long, but not too often.',
      'Walk away from a heated argument to cool down.',
      'Enjoying indulgences in reasonable amounts.',
    ],
  },
  'Cleanliness': {
    name: 'Cleanliness',
    emoji: '✨',
    description: 'Keep your body, clothes, and habitation clean.',
    examples: [
      'Practicing good hygiene.',
      'Maintaining a tidy living space.',
      'Wash the dishes immediately after eating.',
    ],
  },
  'Tranquility': {
    name: 'Tranquility',
    emoji: '🌳',
    description: 'Be not disturbed at trifles, or at accidents common or unavoidable.',
    examples: [
      'Focusing on solutions rather than dwelling on problems.',
      'Accepting that some things are beyond control.',
      'Breathe deeply when you spill your coffee instead of getting upset.',
    ],
  },
  'Purity': {
    name: 'Purity',
    emoji: '❤️',
    description: 'Use actions thoughtfully, aligning them with their purpose; never to dullness, weakness, or the injury of your own or another’s peace or reputation.',
    examples: [
      'Making conscious choices that align with personal values.',
      'Speak respectfully about someone, even in their absence.',
      'Pause to reflect before making an impulsive choice.',
    ],
  },
  'Humility': {
    name: 'Humility',
    emoji: '😊',
    description: 'Take specific actions in anticipation of your own errors',
    examples: [
      'Seeking feedback from others.',
      'Acknowledging limitations and asking for help when needed.',
      'Double-check your work before submitting it.',
    ],
  },
};
const virtues = Object.keys(virtuesDict);

// FIXME: remove globalDay referencing, only for developer mode.
// var globalDay = new Date();

const today = (): string => {
  const now = new Date();
  // const now = globalDay;
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};


const fromTimestamp = (yyyymmdd: string): Date => {
  const yyyymmddString = yyyymmdd;
  const yearFromStr = parseInt(yyyymmddString.substring(0, 4), 10);
  const monthFromStr = parseInt(yyyymmddString.substring(4, 6), 10) - 1;
  const dayFromStr = parseInt(yyyymmddString.substring(6, 8), 10);
  return new Date(yearFromStr, monthFromStr, dayFromStr);
};

function weeksBetween(date1: Date, date2: Date): number {
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const diffInMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffInMs / msInWeek);
}

function getWeekNumber(d: Date): number {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  // Handle years with 53 weeks with a duplicate?
  return Math.min(weekNo - 1, 51);
}

const sundaysGone = (date: Date): number => {
  const year = date.getUTCFullYear();

  // Get the day of the week for January 1st of the year
  const jan1Day = new Date(Date.UTC(year, 0, 1)).getUTCDay();

  // Calculate the total number of days passed in the year so far
  const dayOfYear = Math.floor((date.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Adjust jan1Day to treat Sunday as the start of the week
  const offset = (7 - jan1Day) % 7; // Days until the first Sunday

  // Calculate the number of Sundays
  const sundaysPassed = Math.floor((dayOfYear - offset + 6) / 7);

  return sundaysPassed;
};

function dayIndex(yyyymmdd: string) {
  const date = fromTimestamp(yyyymmdd);
  const day = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  return (day + 6) % 7;
  // return (day === 0 ? 6 : day - 1); // Map Sunday to 6, Monday to 0, etc.
}

interface Entry {
  date: string;
  isSuccess: boolean;
  notes: string;
}


const entriesByDate = (entries: Entry[]): Record<string, Entry> => {
  return entries.reduce((acc, entry) => {
    acc[entry.date] = entry;
    return acc;
  }, {} as Record<string, Entry>);
};

const scoring = (entries: Entry[]): number => {
  const uniqueEntries = entriesByDate(entries);

  const filteredEntries = Object.values(uniqueEntries);

  return filteredEntries
    .reduce((score, entry) => score + (entry.isSuccess ? 1 : 0), 0);
};

const failures = (entries: Entry[]): number => {
  const uniqueEntries = entriesByDate(entries);

  const filteredEntries = Object.values(uniqueEntries);

  return filteredEntries
    .reduce((score, entry) => score + (entry.isSuccess ? 0 : 1), 0);
};


const currentStreak = (entries: Entry[]): number => {
  const uniqueEntries = entriesByDate(entries);

  // sort descending by date
  const filteredEntries = Object.values(uniqueEntries).sort(
    (a, b) => parseInt(b.date, 10) - parseInt(a.date, 10)
  );

  let streak = 0;
  let prevDate: Date | null = null;

  for (const entry of filteredEntries) {
    const entryDate = fromTimestamp(entry.date);

    // weird offset to account for strange time differences, it is still "not more than a day"
    if (prevDate && (prevDate.getTime() - entryDate.getTime()) > (24 + 5) * 60 * 60 * 1000) {
      break; // not consecutive
    }
    prevDate = entryDate;
    streak++;
  }

  return streak;
};


interface UserState {
  entries: Entry[]
}

const getVirtue = (yyyymmdd: string): string => {
  return virtues[getWeekNumber(fromTimestamp(yyyymmdd)) % virtues.length];
};

const todaysVirtue = (): string => {
  return getVirtue(today());
};

const initialState: UserState = {
  entries: [],
};

function reducer(state: UserState, action: {type: string, payload?: UserState, text?: string}): UserState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    case 'PASS':
      const passedEntries = state.entries.filter((entry) => entry.date !== today());
      const finalEntry = state.entries.length && state.entries[state.entries.length - 1].date === today() ? state.entries[state.entries.length - 1] : {date: '', isSuccess: false, notes: ''} as Entry;
      passedEntries.push({date: today(), isSuccess: true, notes: finalEntry.notes});
      // globalDay.setDate(globalDay.getDate() + 1);
      return { ...state, entries: passedEntries  };
    case 'FAIL':
      const failedEntries = state.entries.filter((entry) => entry.date !== today());

      const lastEntry = state.entries.length && state.entries[state.entries.length - 1].date === today() ? state.entries[state.entries.length - 1] : {date: '', isSuccess: false, notes: ''} as Entry;
      failedEntries.push({date: today(), isSuccess: false, notes: lastEntry.notes});
      // globalDay.setDate(globalDay.getDate() + 1);
      return { ...state, entries: failedEntries };
    case 'TEXT':
      const updatedEntries = state.entries.map((entry) => {
        if (entry.date === today()) {
          return {
            ...entry,
            notes: action.text || '',
          };
        } else {
          return entry;
        }
      });
      if (!(updatedEntries.length) || updatedEntries[updatedEntries.length - 1].date !== today()) {
        // auto set to pass
        updatedEntries.push({date: today(), isSuccess: true, notes: action.text || ''});
      }

      return { ...state, entries: updatedEntries };
    default:
      return state;
  }
}


export const unsqueeze = (entries: Entry[]): Entry[][] => {
  return entries.reduce((weekly: Entry[][], entry) => {

    const previousWeek = weekly.length ? weekly[weekly.length - 1] : [];

    const previousEntry: Entry | null = previousWeek.length ? previousWeek[previousWeek.length - 1] : null;

    const entryDate = fromTimestamp(entry.date);
    const entryIndex = dayIndex(entry.date);

    if (previousEntry === null) {
      weekly.push([entry]);
      return weekly;
    }

    const previousDate = fromTimestamp(previousEntry.date);
    const previousIndex = dayIndex(previousEntry.date);
    const weeks = weeksBetween(previousDate, entryDate);

    const higherIndex = entryIndex > previousIndex;
    const isSameWeek = weeks === 0 && higherIndex;

    if (isSameWeek) {
      previousWeek.push(entry);
      return weekly;
    }

    for (let i = 0; i < weeks; i++) {
      if (i === weeks - 1 && !higherIndex) {
        continue;
      }
      weekly.push([]);
    }
    weekly.push([entry]);
    return weekly;
  },[]);
};

interface RowProps {
  virtue: string;
  entries: Entry[];
  note: string
}

const entriesToRow = (entries: Entry[]): (Entry | null)[] => {
  return entries.reduce((result, entry: Entry, i: number) => {
    // pad days of the week where there was no entry
    const previousEntry = i !== 0 ? entries[i - 1] : null;

    const blankDays = previousEntry === null ? dayIndex(entry.date) : dayIndex(entry.date) - dayIndex(previousEntry.date) - 1;

    for (let j = 0; j < blankDays; j++) {
      result.push(null);
    }
    result.push(entry);
    return result;

  }, [] as (Entry | null)[]);

};

function HistoricalEntry({ historicalEntry }: {historicalEntry: null | Entry}): React.JSX.Element {
  const handleIconClick = (entry: Entry | null) => {
    if (entry === null) {
      return;
    }

    const statusEmoji = entry.isSuccess ? '🌸' : '🔴';
    const time = fromTimestamp(entry.date);
    const date = `${time.getFullYear()}-${time.getMonth()+1}-${time.getDate()}`;

    const virtue = virtuesDict[getVirtue(entry.date)];

    const notes = entry.notes.trim().length ? entry.notes : '[no reflection notes made]';

    Alert.alert(`${date} ${statusEmoji}`, `${virtue.name} ${virtue.emoji}\n\n${notes}`);
  };


  return (<TouchableOpacity
    onPress={() => handleIconClick(historicalEntry)}
    // eslint-disable-next-line react-native/no-inline-styles
    style={{margin: 0}}
  >
    <Text
      // eslint-disable-next-line react-native/no-inline-styles
      style={{fontSize: 20 }}
    >
      {' '}{historicalEntry === null ? '⬜' : historicalEntry.isSuccess ? '🌸' : '🔴'}
    </Text>
  </TouchableOpacity>);
}



function Row({ virtue, entries, note }: RowProps): React.JSX.Element {
  const rows = entriesToRow(entries);

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 2, justifyContent: 'flex-start'}}>
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <Text style={{textAlign: 'left', fontSize: 20}}>{virtue}: </Text>
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
        {rows.map((entry, i) => <HistoricalEntry key={i} historicalEntry={entry} />)}{note !== '' && rows.length === 7 ? <Text>  {note}</Text> : ''}
      </View>
    </View>
  );
}

const InfoIcon = (): React.JSX.Element => {
  const sentence = 'Benjamin Franklin did not attempt to work on all the virtues simultaneously but instead focused on one virtue per week';

  const experience = 'noting in his autobiography that, although he never achieved perfection in these virtues, the attempt itself was highly beneficial to his success and happiness.';

  const descriptions = Object.values(virtuesDict).map((v) => `${v.emoji} ${v.name}: ${v.description}`);

  const lastWords = '"I hope, therefore, that some of my descendants may follow the example and reap the benefit"';

  const messages = [
    sentence,
    experience,
    lastWords,
    '----------',
    'each day you can pass/fail the virtue, each monday the next virtue begins!',
    '----------',
    descriptions.join('\n\n'),
  ];

  const handlePress = () => {
    Alert.alert(
      'guide',
      messages.join('\n\n'),
      [{ text: 'got it!' }]
    );
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text style={styles.infoText}>ℹ️</Text>
    </TouchableOpacity>
  );
};

interface VirtueIconProps {
  virtue: Virtue
}

const VirtueIcon = ({virtue}: VirtueIconProps): React.JSX.Element => {
  const messages = [
    virtue.emoji,
    virtue.description,
    'examples:',
    virtue.examples.join('\n\n'),
  ];

  const handlePress = () => {
    Alert.alert(
      virtue.name,
      messages.join('\n\n'),

      [{ text: 'got it!' }]
    );
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text style={styles.infoText}>ℹ️</Text>
    </TouchableOpacity>
  );
};


interface HistoricalProps {
  entries: Entry[];
}

function Historical({ entries }: HistoricalProps): React.JSX.Element {
  const weeks: Entry[][] = unsqueeze(entries);
  // the most recent entry is not necessarily from this week.
  const latestEntryWeekDate = weeks.length ? weeks[weeks.length - 1][0].date : today();
  const relDate = fromTimestamp(latestEntryWeekDate);
  const lastYear = relDate.getFullYear();
  const lastWoy = sundaysGone(relDate);
  const weeksGone = (lastYear * 52) + lastWoy;
  const latestVirtue = getVirtue(latestEntryWeekDate);
  const latestVirtueIndex = virtues.indexOf(latestVirtue);

  const weeksReversed = [...weeks].reverse();

  return (
    <View>
      {weeksReversed.map(
        (week, i) => {
          let virtueIndex = (latestVirtueIndex - i) % virtues.length;
          if (virtueIndex < 0) {
            virtueIndex = virtues.length + virtueIndex;
          }

          const weekIndex = weeksGone - i;
          const woy = weekIndex % 52;
          const year = Math.floor(weekIndex / 52);
          const quarter = woy < 13 ? 1 : woy < 26 ? 2 : woy < 39 ? 3 : 4;

          return (
            <View key={i}>
              <Row
                virtue={virtuesDict[virtues[virtueIndex]].emoji}
                entries={week}
                note={
                  virtueIndex === 0 ? `${year} Q${quarter}` : ''
                }
              />
              {/* eslint-disable-next-line react-native/no-inline-styles */}
              {virtueIndex === 0 && <View style={{marginVertical: 5}} />}
            </View>
          );
        }
        )
      }
    </View>
  );
}

function Daily(): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loadState = async () => {
      try {
        const entriesString = await AsyncStorage.getItem('ENTRIES');
        const entries = entriesString != null ? JSON.parse(entriesString) as Entry[] : [];

        dispatch({
          type: 'LOAD_STATE',
          payload: {
            entries: entries,
          },
        });
      } catch (error) {
        console.error('Failed to load state:', error);
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    const saveState = async () => {
      try {
        const uniqueEntries = Object.values(entriesByDate(state.entries));
        await AsyncStorage.setItem('ENTRIES', JSON.stringify(uniqueEntries));
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    };
    saveState();
  }, [state.entries]);

  const handlePass = () => {
    dispatch({ type: 'PASS' });
  };

  const handleFail = () => {
    dispatch({ type: 'FAIL' });
  };

  const handleNotes = (notes: string) => {
    const text = notes.slice(0, 1000);
    dispatch({ type: 'TEXT', text: text });
  };

  const virtueDetails = virtuesDict[todaysVirtue()];

  const todaysResponse = state.entries.length && state.entries[state.entries.length - 1].date === today() ? state.entries[state.entries.length - 1] : null;

  return (
    <View style={styles.dailyContainer}>
      <View style={styles.topSection}>
        <Text style={styles.leftScore}>🔥 {currentStreak(state.entries)} 🌸 {scoring(state.entries)} 🔴 {failures(state.entries)}</Text>
        <View>
          <InfoIcon />
        </View>
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.virtue}>{virtueDetails.name}</Text>
        <VirtueIcon virtue={virtueDetails} />
        <Text style={styles.details}>{virtueDetails.description}</Text>
        <Text style={styles.virtue}>
          {virtueDetails.emoji}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleFail}
        >
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ fontWeight: todaysResponse && todaysResponse.isSuccess === false ? 'bold' : 'normal', fontSize: 19 }}>🔴 Fail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePass}
        >
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ fontWeight: todaysResponse && todaysResponse.isSuccess ? 'bold' : 'normal', fontSize: 20 }}>Pass 🌸</Text>
        </TouchableOpacity>
      </View>
      <View>
      <TextInput
        style={styles.textArea}
        placeholder="your reflection for today..."
        multiline
        value={todaysResponse ? todaysResponse.notes : '' }
        onChangeText={handleNotes}
      />
    </View>

      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <View style={{marginTop: '20%'}}>
        <Historical entries={state.entries}/>
      </View>
    </View>
  );

}


function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
            <Daily />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  history: {
    fontSize: 20,
    textAlign: 'left',
  },
  virtue: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dailyContainer: {
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    padding: 20,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '20%',
  },
  leftScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4500', // Fire color
  },
  rightHelp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000', // Black for scores
  },
  middleSection: {
    justifyContent: 'center', // Center virtue details
    alignItems: 'center',
    textAlign: 'center',
    minHeight: 60,
  },
  details: {
    fontSize: 16,
    color: '#555', // Grey for description
    textAlign: 'center',
    minHeight: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Evenly space the buttons
    marginVertical: 20,
  },
  textArea: {
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlignVertical: 'top',
  },
  infoButton: {
    fontSize: 18,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default App;
