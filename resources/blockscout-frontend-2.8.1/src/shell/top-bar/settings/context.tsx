// SPDX-License-Identifier: LicenseRef-Blockscout

import React from 'react';

import { type AddressFormat } from 'src/slices/address/types/config';

import config from 'src/config';
import { useAppContext } from 'src/shell/app/context';

import * as cookies from 'src/shared/storage/cookies';

import type { TimeFormat } from './time-format/utils';

const availableAddressFormats = config.slices.address.hashFormat.availableFormats;
const defaultAddressFormat: AddressFormat = availableAddressFormats[0] ?? 'base16';

function resolveAddressFormat(cookieValue: string | undefined): AddressFormat {
  if (cookieValue && availableAddressFormats.includes(cookieValue as AddressFormat)) {
    return cookieValue as AddressFormat;
  }

  return defaultAddressFormat;
}

interface SettingsProviderProps {
  children: React.ReactNode;
}

interface TSettingsContext {
  addressFormat: AddressFormat;
  toggleAddressFormat: () => void;
  timeFormat: TimeFormat;
  toggleTimeFormat: () => void;
  isLocalTime: boolean;
  toggleIsLocalTime: () => void;
}

export const SettingsContext = React.createContext<TSettingsContext | null>(null);

export function SettingsContextProvider({ children }: SettingsProviderProps) {
  const { cookies: appCookies } = useAppContext();
  const initialAddressFormat = cookies.get(cookies.NAMES.ADDRESS_FORMAT, appCookies);

  const [ addressFormat, setAddressFormat ] = React.useState<AddressFormat>(
    () => resolveAddressFormat(initialAddressFormat),
  );

  React.useEffect(() => {
    if (!initialAddressFormat || !availableAddressFormats.includes(initialAddressFormat as AddressFormat)) {
      cookies.set(cookies.NAMES.ADDRESS_FORMAT, defaultAddressFormat);
    }
  }, [ initialAddressFormat ]);

  const [ timeFormat, setTimeFormat ] = React.useState<TimeFormat>(
    cookies.get(cookies.NAMES.TIME_FORMAT, appCookies) as TimeFormat || 'relative',
  );

  const [ isLocalTime, setIsLocalTime ] = React.useState<boolean>(
    (cookies.get(cookies.NAMES.LOCAL_TIME, appCookies) ?? 'true') === 'true',
  );

  const toggleAddressFormat = React.useCallback(() => {
    setAddressFormat(prev => {
      const nextValue = prev === 'base16' ? 'bech32' : 'base16';
      cookies.set(cookies.NAMES.ADDRESS_FORMAT, nextValue);
      return nextValue;
    });
  }, []);

  const toggleTimeFormat = React.useCallback(() => {
    setTimeFormat(prev => {
      const nextValue = prev === 'relative' ? 'absolute' : 'relative';
      cookies.set(cookies.NAMES.TIME_FORMAT, nextValue);
      return nextValue;
    });
  }, []);

  const toggleIsLocalTime = React.useCallback(() => {
    setIsLocalTime(prev => {
      const nextValue = !prev;
      cookies.set(cookies.NAMES.LOCAL_TIME, nextValue ? 'true' : 'false');
      return nextValue;
    });
  }, []);

  const value = React.useMemo(() => {
    return {
      addressFormat,
      toggleAddressFormat,
      timeFormat,
      toggleTimeFormat,
      isLocalTime,
      toggleIsLocalTime,
    };
  }, [ addressFormat, toggleAddressFormat, timeFormat, toggleTimeFormat, isLocalTime, toggleIsLocalTime ]);

  return (
    <SettingsContext.Provider value={ value }>
      { children }
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(disabled?: boolean) {
  const context = React.useContext(SettingsContext);
  if (context === undefined || disabled) {
    return null;
  }
  return context;
}
