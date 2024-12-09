import React, { useReducer, useEffect } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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

const getWeekOfYear = (date: Date) => {
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
    // .filter(entry => fromTimestamp(entry.date) >= startDate)
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
    if (entry.isSuccess) {
      streak++;
    } else {
      break; // failure
    }
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
      const passedEntries = state.entries;
      passedEntries.push({date: today(), isSuccess: true});
      return { ...state, entries: passedEntries  };
    case 'FAIL':
      const failedEntries = state.entries;
      failedEntries.push({date: today(), isSuccess: false});
      return { ...state, entries: failedEntries };
    default:
      return state;
  }
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

  return (
    <View style={styles.container}>
      <Text style={styles.score}>
        <Text role="img" aria-label="star">🌸</Text> {scoring(state.entries)}
        <Text role="img" aria-label="fire">🔥</Text> {currentStreak(state.entries)}
        <Text role="img" aria-label="fire">🔴</Text> {failures(state.entries)}
      </Text>

      <Text style={styles.virtue}>
        <Text role="img" aria-label="virtue">{virtueDetails.emoji}</Text> {virtueDetails.name} <Text role="img" aria-label="virtue">{virtueDetails.emoji}</Text>
      </Text>

      <View style={styles.buttonContainer}>
        <Button title="❌Fail" onPress={handleFail} />
        <Button title="Pass✔️" onPress={handlePass} />
      </View>

      <Text style={styles.details}>
        {virtueDetails.name} is one of the 13 virtues outlined by Benjamin Franklin. It focuses on...
      </Text>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    padding: 20,
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  virtue: {
    fontSize: 22,
    fontStyle: 'italic',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
  },
  details: {
    fontSize: 16,
    marginTop: 30,
    textAlign: 'center',
    color: '#555',
    maxWidth: 300,
  },
});

export default App;
