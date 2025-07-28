'use client';

import * as React from 'react';
import { createContext, useContext, useCallback, useState } from 'react';

export interface ModalConfig {
  id: string;
  component: React.ReactNode;
  zIndex?: number;
  persistent?: boolean; // Cannot be closed by overlay click or escape
  onClose?: () => void;
}

interface ModalManagerContextType {
  modals: ModalConfig[];
  openModal: (_config: Omit<ModalConfig, 'id'> & { id?: string }) => string;
  closeModal: (_id: string) => void;
  closeAllModals: () => void;
  closeTopModal: () => void;
  isModalOpen: (_id: string) => boolean;
  getTopModal: () => ModalConfig | null;
  getModalCount: () => number;
}

const ModalManagerContext = createContext<ModalManagerContextType | null>(null);

export interface ModalManagerProps {
  children: React.ReactNode;
  baseZIndex?: number;
  maxModals?: number;
}

export function ModalManager({
  children,
  baseZIndex = 1000,
  maxModals = 10,
}: ModalManagerProps) {
  const [modals, setModals] = useState<ModalConfig[]>([]);

  const openModal = useCallback(
    (_config: Omit<ModalConfig, 'id'> & { id?: string }): string => {
      const config = _config;
      const id =
        config.id ||
        `modal-${Date.now()}-${require('crypto').randomBytes(5).toString('hex')}`;

      setModals(prevModals => {
        // Check if we've reached the maximum number of modals
        if (prevModals.length >= maxModals) {
          console.warn(
            `Maximum number of modals (${maxModals}) reached. Cannot open new modal.`
          );
          return prevModals;
        }

        // Check if modal with this ID already exists
        if (prevModals.some(modal => modal.id === id)) {
          console.warn(`Modal with ID "${id}" already exists.`);
          return prevModals;
        }

        const newModal: ModalConfig = {
          ...config,
          id,
          zIndex: config.zIndex || baseZIndex + prevModals.length,
        };

        return [...prevModals, newModal];
      });

      return id;
    },
    [baseZIndex, maxModals]
  );

  const closeModal = useCallback((_id: string) => {
    const id = _id;
    setModals(prevModals => {
      const modalToClose = prevModals.find(modal => modal.id === id);
      if (modalToClose?.onClose) {
        modalToClose.onClose();
      }
      return prevModals.filter(modal => modal.id !== id);
    });
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(prevModals => {
      // Call onClose for each modal
      prevModals.forEach(modal => {
        if (modal.onClose) {
          modal.onClose();
        }
      });
      return [];
    });
  }, []);

  const closeTopModal = useCallback(() => {
    setModals(prevModals => {
      if (prevModals.length === 0) return prevModals;

      const topModal = prevModals[prevModals.length - 1];
      if (topModal.persistent) {
        console.warn('Cannot close persistent modal');
        return prevModals;
      }

      if (topModal.onClose) {
        topModal.onClose();
      }

      return prevModals.slice(0, -1);
    });
  }, []);

  const isModalOpen = useCallback(
    (_id: string): boolean => {
      const id = _id;
      return modals.some(modal => modal.id === id);
    },
    [modals]
  );

  const getTopModal = useCallback((): ModalConfig | null => {
    return modals.length > 0 ? modals[modals.length - 1] : null;
  }, [modals]);

  const getModalCount = useCallback((): number => {
    return modals.length;
  }, [modals]);

  // Handle escape key for closing top modal
  React.useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modals.length > 0) {
        const topModal = modals[modals.length - 1];
        if (!topModal.persistent) {
          closeTopModal();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [modals, closeTopModal]);

  // Prevent body scroll when modals are open
  React.useEffect(() => {
    if (modals.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [modals.length]);

  const contextValue: ModalManagerContextType = {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    closeTopModal,
    isModalOpen,
    getTopModal,
    getModalCount,
  };

  return (
    <ModalManagerContext.Provider value={contextValue}>
      {children}
      {/* Render all modals */}
      {modals.map(modal => (
        <div
          key={modal.id}
          style={{ zIndex: modal.zIndex }}
          className="fixed inset-0"
        >
          {modal.component}
        </div>
      ))}
    </ModalManagerContext.Provider>
  );
}

export function useModalManager() {
  const context = useContext(ModalManagerContext);
  if (!context) {
    throw new Error('useModalManager must be used within a ModalManager');
  }
  return context;
}

// Convenience hooks for specific modal types
export function useModal() {
  const { openModal, closeModal, isModalOpen } = useModalManager();

  const [modalId, setModalId] = useState<string | null>(null);

  const open = useCallback(
    (config: Omit<ModalConfig, 'id'>) => {
      const id = openModal(config);
      setModalId(id);
      return id;
    },
    [openModal]
  );

  const close = useCallback(() => {
    if (modalId) {
      closeModal(modalId);
      setModalId(null);
    }
  }, [modalId, closeModal]);

  const isOpen = modalId ? isModalOpen(modalId) : false;

  return {
    open,
    close,
    isOpen,
    modalId,
  };
}

// Hook for managing a specific modal instance
export function useModalInstance(id: string) {
  const { openModal, closeModal, isModalOpen } = useModalManager();

  const open = useCallback(
    (config: Omit<ModalConfig, 'id'>) => {
      return openModal({ ...config, id });
    },
    [openModal, id]
  );

  const close = useCallback(() => {
    closeModal(id);
  }, [closeModal, id]);

  const isOpen = isModalOpen(id);

  return {
    open,
    close,
    isOpen,
  };
}
