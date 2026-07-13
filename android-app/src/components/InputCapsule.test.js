import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Keyboard, Platform } from 'react-native';
import InputCapsule from './InputCapsule';

jest.mock('../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: { bgApp: '#000', surfaceSunken: '#111', borderDefault: '#222', textTertiary: '#333', textPrimary: '#fff', textOnInverse: '#fff', actionPrimaryText: '#000', accentIcon: '#555', statusDanger: 'red', actionPrimaryBg: 'blue' },
    spacing: { lg: 20 },
    radius: { pill: 25 },
    typography: { body: {} }
  })
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 34, top: 40, left: 0, right: 0 })
}));

describe('InputCapsule Padding', () => {
  let keyboardShowListeners = [];
  let keyboardHideListeners = [];

  beforeEach(() => {
    keyboardShowListeners = [];
    keyboardHideListeners = [];
    
    Keyboard.addListener = jest.fn((event, callback) => {
      if (event === 'keyboardWillShow' || event === 'keyboardDidShow') {
        keyboardShowListeners.push(callback);
      } else if (event === 'keyboardWillHide' || event === 'keyboardDidHide') {
        keyboardHideListeners.push(callback);
      }
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adjusts padding based on keyboard state', () => {
    let root;
    act(() => {
      root = renderer.create(<InputCapsule input="" setInput={() => {}} />);
    });
    
    const getWrapperStyle = () => {
      const wrapper = root.root.findByProps({ testID: 'input-capsule-wrapper' });
      // React Native StyleSheet arrays: style can be an array of objects
      return wrapper.props.style;
    };

    // By default, when keyboard is closed, padding should be BASE_PADDING (15) + insets.bottom (34) = 49
    expect(getWrapperStyle()).toEqual(expect.arrayContaining([
      expect.objectContaining({ paddingBottom: 49 })
    ]));

    // Simulate keyboard open
    act(() => {
      keyboardShowListeners.forEach(cb => cb({ endCoordinates: { height: 300 } }));
    });

    // When keyboard is open, padding should be just BASE_PADDING (15)
    expect(getWrapperStyle()).toEqual(expect.arrayContaining([
      expect.objectContaining({ paddingBottom: 15 })
    ]));

    // Simulate keyboard close
    act(() => {
      keyboardHideListeners.forEach(cb => cb());
    });

    // Should return to 49
    expect(getWrapperStyle()).toEqual(expect.arrayContaining([
      expect.objectContaining({ paddingBottom: 49 })
    ]));
  });
});
