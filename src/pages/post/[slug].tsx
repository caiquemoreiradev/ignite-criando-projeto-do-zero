import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';

import styles from './post.module.scss';
import { useRouter } from "next/router";

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {

  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((total, contentItem) => {
    

    const words = contentItem.body.map(item => item.text.split(' ').length);
    words.map(word => (total += word));
    return total;
  }, 0);

  const readTime = Number(Math.ceil(totalWords / 200));

  const formatedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  return (
    <>
      <Head>
        <title>{post.data.title} | Ignews</title>
      </Head>

      <main className={styles.container}>

        <img
          src={post.data.banner.url}
          alt="article banner"
          className={styles.banner}
        />

        <div className={styles.post}>

          <h1>{post.data.title}</h1>

          <ul>
            <li>
              <FiCalendar />
              {formatedDate}
            </li>

            <li>
              <FiUser />
              {post.data.author}
            </li>

            <li>
              <FiClock />
              {`${readTime} min`}
            </li>
          </ul>

          {post.data.content.map(content => (
            <article key={content.heading}>
              <h2>{content.heading}</h2>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </article>
          ))}
        </div>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {

  const prismic = getPrismicClient();

  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params, preview = false, previewData }) => {

  const prismic = getPrismicClient();

  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      preview,
    },
    revalidate: 1800,
  };
};