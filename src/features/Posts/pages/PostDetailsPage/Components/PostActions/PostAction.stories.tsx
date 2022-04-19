import { ComponentStory, ComponentMeta } from '@storybook/react';

import PostActions from './PostActions';

export default {
    title: 'Posts/Post Page/Components/PostActions',
    component: PostActions,
    argTypes: {
        backgroundColor: { control: 'color' },
    },
} as ComponentMeta<typeof PostActions>;


const Template: ComponentStory<typeof PostActions> = (args) => <div className="max-w-[326px]"><PostActions {...args as any} ></PostActions></div>

export const Default = Template.bind({});
Default.args = {
}


