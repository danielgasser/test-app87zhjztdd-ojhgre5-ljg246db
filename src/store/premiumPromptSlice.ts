import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FeatureName } from "@/config/features";

interface PremiumPromptState {
    visible: boolean;
    feature: FeatureName | null;
    description: string | null;
}

const initialState: PremiumPromptState = {
    visible: false,
    feature: null,
    description: null,
};

const premiumPromptSlice = createSlice({
    name: "premiumPrompt",
    initialState,
    reducers: {
        showPremiumPrompt: (
            state,
            action: PayloadAction<{ feature: FeatureName; description?: string }>
        ) => {
            state.visible = true;
            state.feature = action.payload.feature;
            state.description = action.payload.description || null;
        },
        hidePremiumPrompt: (state) => {
            state.visible = false;
            state.feature = null;
            state.description = null;
        },
    },
});

export const { showPremiumPrompt, hidePremiumPrompt } = premiumPromptSlice.actions;
export default premiumPromptSlice.reducer;