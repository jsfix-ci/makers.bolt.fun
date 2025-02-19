
import { useUpdateEffect } from '@react-hookz/web'
import { useState } from 'react'
import { useFeedQuery } from 'src/graphql'
import { useInfiniteQuery, usePreload } from 'src/utils/hooks'
import PostsList from '../../Components/PostsList/PostsList'
import TrendingCard from '../../Components/TrendingCard/TrendingCard'
import PopularTagsFilter, { FilterTag } from './PopularTagsFilter/PopularTagsFilter'
import SortBy from './SortBy/SortBy'
import styles from './styles.module.scss'
import { Helmet } from "react-helmet";
import Button from 'src/Components/Button/Button'
import { FiArrowRight } from 'react-icons/fi'
import { capitalize } from 'src/utils/helperFunctions'
import { bannerData } from 'src/features/Projects/pages/ExplorePage/Header/Header'
import { createRoute } from 'src/utils/routing'
import { Link } from 'react-router-dom'
import { useAppDispatch, } from 'src/utils/hooks';
import { stageStory } from 'src/redux/features/staging.slice'


export default function FeedPage() {

    const [sortByFilter, setSortByFilter] = useState<string | null>('recent')
    const [tagFilter, setTagFilter] = useState<FilterTag | null>(null);
    const dispatch = useAppDispatch()


    const feedQuery = useFeedQuery({
        variables: {
            take: 10,
            skip: 0,
            sortBy: sortByFilter,
            tag: tagFilter?.id ?? null
        },
    })
    const { fetchMore, isFetchingMore, variablesChanged } = useInfiniteQuery(feedQuery, 'getFeed')
    useUpdateEffect(variablesChanged, [sortByFilter, tagFilter]);

    usePreload('PostPage');



    return (
        <>
            <Helmet>
                <title>{`Bolt.Fun`}</title>
                <meta property="og:title" content={`Bolt.Fun`} />
            </Helmet>
            <div
                className={`page-container`}
            >
                <Link to={createRoute({ type: "tournament", id: 1 })}>
                    <div className="rounded-16 min-h-[280px] relative overflow-hidden p-16 md:p-24 flex flex-col items-start justify-end mb-24">
                        <img
                            className="w-full h-full object-cover object-center absolute top-0 left-0 z-[-2]"
                            src={bannerData.img}
                            alt=""
                        />
                        <div className="w-full h-full object-cover bg-gradient-to-t from-gray-900 absolute top-0 left-0 z-[-1]"></div>
                        <div className="max-w-[90%]">
                            {bannerData.title}
                        </div>
                    </div>
                </Link>
                <div className={`w-full ${styles.grid}`}>
                    <div id="title">
                        {tagFilter && <p className="text-body6 text-gray-500 font-medium mb-8">
                            <span className='cursor-pointer' onClick={() => setTagFilter(null)}>Stories </span>
                            <FiArrowRight />
                            <span> {tagFilter.title}</span>
                        </p>}
                        <h1 className="text-h2 font-bolder">{
                            tagFilter &&
                            <>{tagFilter.icon} {capitalize(tagFilter.title)}</>
                        }</h1>
                    </div>
                    <div id="sort-by">
                        <SortBy
                            filterChanged={setSortByFilter}
                        />
                    </div>
                    <div id="content" className='pt-16 md:pt-0'>
                        <PostsList
                            isLoading={feedQuery.loading}
                            items={feedQuery.data?.getFeed}
                            isFetching={isFetchingMore}
                            onReachedBottom={fetchMore}
                        />
                    </div>
                    <aside id='categories' className='no-scrollbar'>
                        <div className="md:overflow-y-scroll sticky-side-element flex flex-col gap-16 md:gap-24">
                            <h1 className={`${tagFilter && "hidden"} md:block text-h2 font-bolder order-1`}>Discover</h1>
                            <div className='order-3 md:order-2'>
                                <Button
                                    href={createRoute({ type: "write-story" })}
                                    color='primary'
                                    fullWidth
                                    onClick={() => dispatch(stageStory(null))}
                                >
                                    Write a story
                                </Button>
                            </div>
                            <div className='order-2 md:order-3'>
                                <PopularTagsFilter
                                    value={tagFilter}
                                    onChange={setTagFilter as any}
                                />
                            </div>
                        </div>
                    </aside>
                    <aside id='side' className='no-scrollbar'>
                        <div className="pb-16 flex flex-col gap-24 overflow-y-auto sticky-side-element" >
                            <TrendingCard />
                            <a href='https://discord.gg/HFqtxavb7x' target='_blank' rel="noreferrer">
                                <div className='min-h-[248px] text-white flex flex-col justify-end p-24 rounded-12 relative overflow-hidden'
                                    style={{
                                        backgroundImage: `url("/assets/images/join-discord-card.jpg")`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: "center"
                                    }}
                                >
                                    <div className="absolute bg-black inset-0 opacity-10"></div>
                                    <div className="relative flex flex-col gap-24">
                                        <div className="flex flex-col gap-8 text-white">
                                            <img src={'assets/icons/join-discord.svg'} className='h-48 max-w-full self-start' alt="" />
                                            <p className="text-body2 font-bold">BOLT🔩FUN Discord</p>
                                            <p className="text-body4 font-medium">Join the Bolt.Fun Community Discord server and connect with other like minded developers!</p>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    )
}
