import React, { useReducer, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
}

// FIXME: make better descriptions
const virtuesDict: Record<string, Virtue> = {
  'Temperance': { name: 'Temperance', emoji: '🧘‍♂️', description: 'Practice moderation in all things and avoid excess.' },
  'Silence': { name: 'Silence', emoji: '🕊️', description: 'Speak only when it benefits others or yourself. Avoid trifling conversation.' },
  'Order': { name: 'Order', emoji: '🗂️', description: 'Let all things have their place; let each part of your business have its time.' },
  'Resolution': { name: 'Resolution', emoji: '💪', description: 'Resolve to perform what you ought; perform without fail what you resolve.' },
  'Frugality': { name: 'Frugality', emoji: '🌱', description: 'Make no expense but to do good to others or yourself; waste nothing.' },
  'Industry': { name: 'Industry', emoji: '🛠️', description: 'Always be engaged in something useful; avoid idleness.' },
  'Sincerity': { name: 'Sincerity', emoji: '🤝', description: 'Use no hurtful deceit; think innocently and justly, and speak accordingly.' },
  'Justice': { name: 'Justice', emoji: '⚖️', description: 'Wrong none by doing injuries or omitting benefits that are your duty.' },
  'Moderation': { name: 'Moderation', emoji: '🛑', description: 'Avoid extremes; forbear resenting injuries as much as you think they deserve.' },
  'Cleanliness': { name: 'Cleanliness', emoji: '✨', description: 'Keep your body, clothes, and habitation clean.' },
  'Tranquility': { name: 'Tranquility', emoji: '🌳', description: 'Be not disturbed at trifles, or at accidents common or unavoidable.' },
  'Chastity': { name: 'Chastity', emoji: '❤️', description: 'Rarely use venery but for health or offspring; never to dullness, weakness, or the injury of your own or another’s peace or reputation.' },
  'Humility': { name: 'Humility', emoji: '😊', description: 'Imitate Jesus and Socrates.' },
};

const virtues = Object.keys(virtuesDict);

const today = (): string => {
  const now = new Date();
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

const getWeekOfYear = (date: Date) => {
  // FIXME: consider making the week start on sunday instead
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Reset time to midnight

  // Set to Thursday in the current week (ISO week starts on Monday)
  targetDate.setDate(targetDate.getDate() + 3 - ((targetDate.getDay() + 6) % 7));

  // January 4th is always in week 1 (ISO rule)
  const firstWeek: Date = new Date(targetDate.getFullYear(), 0, 4);
  const diff = targetDate.getTime() - firstWeek.getTime();

  const daysDiff = Math.round(diff / (24 * 60 * 60 * 1000));

  // zero index
  // some years have 53 weeks, lets just duplicate the last week in that case
  return Math.min(Math.floor(daysDiff / 7), 51);
};

function dayIndex(yyyymmdd: string) {
  // FIXME: consider making the week start on sunday instead
  const date = fromTimestamp(yyyymmdd);
  const day = date.getDay();
  return (day + 6) % 7;
}

interface Entry {
  date: string;
  isSuccess: boolean;
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

    if (prevDate && (prevDate.getTime() - entryDate.getTime()) !== 24 * 60 * 60 * 1000) {
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
  return virtues[getWeekOfYear(fromTimestamp(yyyymmdd)) % virtues.length];
};

const todaysVirtue = (): string => {
  return getVirtue(today());
};

const initialState: UserState = {
  entries: [],
};

function reducer(state: UserState, action: {type: string, payload?: UserState}): UserState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    case 'PASS':
      const passedEntries = state.entries.filter((entry) => entry.date !== today());
      passedEntries.push({date: today(), isSuccess: true});
      return { ...state, entries: passedEntries  };
    case 'FAIL':
      const failedEntries = state.entries.filter((entry) => entry.date !== today());
      failedEntries.push({date: today(), isSuccess: false});
      return { ...state, entries: failedEntries };
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
}

const entriesToRow = (entries: Entry[]): string[] => {
  return Array.from({ length: 7 }, (_, i) => {
    return i > entries.length - 1 ? ' ' : entries[i].isSuccess ? '🌸' : '🔴';
  });
};

function Row({ virtue, entries }: RowProps): React.JSX.Element {
  const rowIcons = entriesToRow(entries);

  return (
    <View>
      <Text>{virtue}: {rowIcons.join(' ')}</Text>
    </View>
  );

}

interface HistoricalProps {
  entries: Entry[];
}

function Historical({ entries }: HistoricalProps): React.JSX.Element {
  const weeks: Entry[][] = unsqueeze(entries);
  // the most recent entry is not necessarily from this week.
  const latestEntryWeekDate = weeks.length ? weeks[weeks.length - 1][0].date : today();
  const latestVirtue = getVirtue(latestEntryWeekDate);
  const virtueIndex = virtues.indexOf(latestVirtue);

  const weeksReversed = [...weeks].reverse();

  return (
    <View>
      {weeksReversed.map(
        (week, i) => <Row key={i} virtue={virtuesDict[virtues[(virtueIndex - i) % virtues.length]].emoji} entries={week} />
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
            entries,
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

  const virtueDetails = virtuesDict[todaysVirtue()];

  const todaysResponse = state.entries.length && state.entries[state.entries.length - 1].date === today() ? state.entries[state.entries.length - 1] : null;

  return (
    <View style={styles.dailyContainer}>
      <View style={styles.topSection}>
        <Text style={styles.leftScore}>🔥 {currentStreak(state.entries)}</Text>
        <Text style={styles.rightScore}>
          🌸 {scoring(state.entries)} 🔴 {failures(state.entries)}
        </Text>
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.virtue}>{virtueDetails.name}</Text>
        <Text style={styles.details}>{virtueDetails.description}</Text>
        <Text style={styles.virtue}>
          {virtueDetails.emoji}
          {virtueDetails.emoji}
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
    paddingBottom: '50%',
  },
  leftScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4500', // Fire color
  },
  rightScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000', // Black for scores
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center', // Center virtue details
    alignItems: 'center',
    textAlign: 'center',
  },
  details: {
    fontSize: 16,
    color: '#555', // Grey for description
    textAlign: 'center',
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Evenly space the buttons
    marginVertical: 20,
  },
});

export default App;
