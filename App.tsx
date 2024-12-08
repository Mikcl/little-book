import React, { useReducer, useEffect } from 'react';
import {
  Alert,
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
  Header,
} from 'react-native/Libraries/NewAppScreen';

interface Virtue {
  name: string;
  emoji: string;
  description: string;
}

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

interface UserState {
  score: number,
  streak: number,
  // success === 'pass'
  isSuccess: string | null,
}

const todaysVirtue = (): string => {
  return virtues[new Date().getDay() % virtues.length];
};

const initialState = {
  score: 0,
  streak: 0,
  virtue: todaysVirtue(),
  isSuccess: null,
};

const devMode = true;

// Define reducer
function reducer(state: UserState, action: {type: string, payload?: UserState}): UserState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    case 'PASS':
      const newStreak = state.isSuccess ? state.streak + 1 : 1;
      return { ...state, score: state.score + 1, isSuccess: 'pass', streak: newStreak };
    case 'FAIL':
      return { ...state, isSuccess: 'fail', streak: 0 };
    default:
      return state;
  }
}


function Daily(): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const score = await AsyncStorage.getItem('score');
        const streak = await AsyncStorage.getItem('streak');
        const todayStatus = await AsyncStorage.getItem(getTodayKey());
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            score: score ? parseInt(score, 10) : 0,
            streak: streak ? parseInt(streak, 10) : 0,
            isSuccess: todayStatus,
          },
        });
      } catch (error) {
        console.error('Failed to load state:', error);
      }
    };
    loadState();
  }, []);

  // Save score and daily status to AsyncStorage
  useEffect(() => {
    const saveState = async () => {
      try {
        await AsyncStorage.setItem('score', state.score.toString());
        await AsyncStorage.setItem('streak', state.streak.toString());
        if (state.isSuccess) {
          await AsyncStorage.setItem(getTodayKey(), state.isSuccess);
        }
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    };
    saveState();
  }, [state.score, state.isSuccess, state.streak]);

  // Helper function to get today's storage key
  const getTodayKey = () => `status-${new Date().toISOString().split('T')[0]}`;

  // Handle pass
  const handlePass = () => {
    if (state.isSuccess && !devMode) {
      Alert.alert('You have already recorded your progress for today!');
      return;
    }
    dispatch({ type: 'PASS' });
  };

  // Handle fail
  const handleFail = () => {
    if (state.isSuccess && !devMode) {
      Alert.alert('You have already recorded your progress for today!');
      return;
    }
    dispatch({ type: 'FAIL' });
  };

  const virtueDetails = virtuesDict[todaysVirtue()];

  return (
    <View style={styles.container}>
      <Text style={styles.score}>
        <Text role="img" aria-label="star">⭐</Text> {state.score}.
        <Text role="img" aria-label="fire">🔥</Text> {state.streak}
      </Text>

      <Text style={styles.virtue}>
        <Text role="img" aria-label="virtue">{virtueDetails.emoji}</Text> {virtueDetails.name} <Text role="img" aria-label="virtue">{virtueDetails.emoji}</Text>
      </Text>

      <View style={styles.buttonContainer}>
        <Button title="✔️ Pass" onPress={handlePass} />
        <Button title="❌ Fail" onPress={handleFail} />
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
        <Header />
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
